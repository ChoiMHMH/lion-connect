/**
 * apiClient 토큰 리프레시 동시성 테스트 (T3)
 *
 * 검증 대상:
 * - 401 → /auth/refresh → 재시도 파이프라인
 * - 동시 3요청이 모두 401 받아도 refresh 호출은 1회
 * - refresh 토큰 추출: Authorization 헤더 1순위 → body.accessToken 2순위
 * - 재시도 성공 후 useAuthStore.accessToken 이 새 토큰으로 업데이트
 *
 * 격리 전략:
 * - apiClient 모듈의 refreshPromise 가 모듈 스코프 변수이므로
 *   각 테스트에서 vi.resetModules() + dynamic import 로 새로 로드.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type FetchMock = ReturnType<typeof vi.fn>;

/**
 * URL 패턴 기반 fetch mock factory.
 *
 * handlers: URL substring → response factory.
 * 매 호출마다 handler 가 다른 응답을 돌리고 싶으면 factory 내부에서 카운터 사용.
 */
function makeFetchMock(
  handlers: Array<{ match: (url: string) => boolean; respond: () => Response | Promise<Response> }>
): FetchMock {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const h of handlers) {
      if (h.match(url)) {
        return h.respond();
      }
    }
    throw new Error(`Unhandled fetch URL: ${url}`);
  });
}

async function loadApiClient() {
  vi.resetModules();
  const mod = await import("@/lib/apiClient");
  const storeMod = await import("@/store/authStore");
  return { mod, storeMod };
}

describe("apiClient — refresh 동시성·토큰 추출", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("401 → refresh(Authorization 헤더) → 재시도 성공", async () => {
    const { mod, storeMod } = await loadApiClient();
    storeMod.useAuthStore.setState({ accessToken: "expired", user: null });

    let originalCallCount = 0;
    const fetchMock = makeFetchMock([
      {
        match: (u) => u.includes("/auth/refresh"),
        respond: () =>
          new Response(null, {
            status: 200,
            headers: { Authorization: "Bearer new-token" },
          }),
      },
      {
        match: (u) => u.includes("/resource"),
        respond: () => {
          originalCallCount += 1;
          if (originalCallCount === 1) {
            return new Response(null, { status: 401 });
          }
          return new Response(JSON.stringify({ ok: 1 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await mod.get<{ ok: number }>("/resource");

    expect(result).toEqual({ ok: 1 });
    expect(storeMod.useAuthStore.getState().accessToken).toBe("new-token");

    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    expect(originalCallCount).toBe(2); // 최초 401 + 재시도 200
  });

  it("401 → refresh(body.accessToken) → 재시도 성공", async () => {
    const { mod, storeMod } = await loadApiClient();
    storeMod.useAuthStore.setState({ accessToken: "expired", user: null });

    let originalCallCount = 0;
    const fetchMock = makeFetchMock([
      {
        match: (u) => u.includes("/auth/refresh"),
        respond: () =>
          new Response(JSON.stringify({ accessToken: "body-token" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      },
      {
        match: (u) => u.includes("/resource"),
        respond: () => {
          originalCallCount += 1;
          if (originalCallCount === 1) {
            return new Response(null, { status: 401 });
          }
          return new Response(JSON.stringify({ ok: 2 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await mod.get<{ ok: number }>("/resource");

    expect(result).toEqual({ ok: 2 });
    expect(storeMod.useAuthStore.getState().accessToken).toBe("body-token");
  });

  it("동시 3요청이 모두 401 → refresh 는 1회만 호출되고 각 원요청 재시도 성공", async () => {
    const { mod, storeMod } = await loadApiClient();
    storeMod.useAuthStore.setState({ accessToken: "expired", user: null });

    const callCounts: Record<string, number> = { a: 0, b: 0, c: 0 };

    const fetchMock = makeFetchMock([
      {
        match: (u) => u.includes("/auth/refresh"),
        respond: () =>
          new Response(null, {
            status: 200,
            headers: { Authorization: "Bearer fresh-token" },
          }),
      },
      {
        match: (u) => u.endsWith("/route-a"),
        respond: () => {
          callCounts.a += 1;
          if (callCounts.a === 1) return new Response(null, { status: 401 });
          return new Response(JSON.stringify({ who: "a" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
      {
        match: (u) => u.endsWith("/route-b"),
        respond: () => {
          callCounts.b += 1;
          if (callCounts.b === 1) return new Response(null, { status: 401 });
          return new Response(JSON.stringify({ who: "b" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
      {
        match: (u) => u.endsWith("/route-c"),
        respond: () => {
          callCounts.c += 1;
          if (callCounts.c === 1) return new Response(null, { status: 401 });
          return new Response(JSON.stringify({ who: "c" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const [ra, rb, rc] = await Promise.all([
      mod.get<{ who: string }>("/route-a"),
      mod.get<{ who: string }>("/route-b"),
      mod.get<{ who: string }>("/route-c"),
    ]);

    expect(ra).toEqual({ who: "a" });
    expect(rb).toEqual({ who: "b" });
    expect(rc).toEqual({ who: "c" });

    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);

    // 각 엔드포인트 정확히 2회 (최초 401 + 재시도 200)
    expect(callCounts).toEqual({ a: 2, b: 2, c: 2 });
    expect(storeMod.useAuthStore.getState().accessToken).toBe("fresh-token");
  });

  it("재시도 요청은 새 토큰으로 Authorization 헤더를 갱신해 보낸다", async () => {
    const { mod, storeMod } = await loadApiClient();
    storeMod.useAuthStore.setState({ accessToken: "expired", user: null });

    let originalCallCount = 0;
    const fetchMock = makeFetchMock([
      {
        match: (u) => u.includes("/auth/refresh"),
        respond: () =>
          new Response(null, {
            status: 200,
            headers: { Authorization: "Bearer rotated" },
          }),
      },
      {
        match: (u) => u.includes("/resource"),
        respond: () => {
          originalCallCount += 1;
          if (originalCallCount === 1) return new Response(null, { status: 401 });
          return new Response(JSON.stringify({ ok: 1 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await mod.get("/resource");

    // /resource 재시도 호출의 Authorization 헤더를 확인
    const resourceCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/resource"));
    expect(resourceCalls).toHaveLength(2);

    const retryInit = resourceCalls[1][1] as RequestInit;
    const retryHeaders = retryInit.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer rotated");
  });
});
