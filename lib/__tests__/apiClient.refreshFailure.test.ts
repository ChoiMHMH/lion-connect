/**
 * apiClient refresh 실패·재시도 엣지 케이스 (T4)
 *
 * 검증 대상:
 * - refresh 엔드포인트 401 → useAuthStore.clearAuth 호출 + 에러 전파
 * - _isRetry: true 플래그가 있으면 401 받아도 refresh 시도 안 함
 * - refresh 성공 후 재시도 응답이 204 → 빈 객체 반환
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type FetchMock = ReturnType<typeof vi.fn>;

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

describe("apiClient — refresh 실패·재시도 엣지 케이스", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refresh 엔드포인트가 401 반환하면 clearAuth 호출 + ApiError 전파", async () => {
    const { mod, storeMod } = await loadApiClient();
    storeMod.useAuthStore.setState({
      accessToken: "expired",
      user: { id: 1, name: "x", email: "x@x", phoneNumber: null, phoneVerified: false, roles: [] },
      isAuthenticated: true,
    });

    const fetchMock = makeFetchMock([
      {
        match: (u) => u.includes("/auth/refresh"),
        respond: () =>
          new Response(JSON.stringify({ message: "refresh expired" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
      },
      {
        match: (u) => u.includes("/resource"),
        respond: () => new Response(null, { status: 401 }),
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(mod.get("/resource")).rejects.toMatchObject({
      name: "ApiError",
      code: "REFRESH_FAILED",
    });

    // clearAuth 호출 결과: accessToken / user / isAuthenticated 전부 리셋
    const state = storeMod.useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("_isRetry: true 플래그가 있으면 401 받아도 refresh 시도 안 함", async () => {
    const { mod, storeMod } = await loadApiClient();
    storeMod.useAuthStore.setState({ accessToken: "tok", user: null });

    const fetchMock = makeFetchMock([
      {
        match: (u) => u.includes("/resource"),
        respond: () =>
          new Response(JSON.stringify({ message: "nope" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    // _isRetry 는 내부 플래그라 public 타입으로는 노출되지 않음 → 테스트 목적 캐스팅
    await expect(
      mod.apiRequest("/resource", { method: "GET", _isRetry: true } as Parameters<
        typeof mod.apiRequest
      >[1])
    ).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 401,
    });

    // refresh 호출 전혀 없음 + /resource 는 딱 1회
    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/auth/refresh"));
    const resourceCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/resource"));
    expect(refreshCalls).toHaveLength(0);
    expect(resourceCalls).toHaveLength(1);
  });

  it("refresh 성공 후 재시도 응답이 204 → 빈 객체 반환", async () => {
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
          return new Response(null, { status: 204 });
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await mod.get<Record<string, never>>("/resource");
    expect(result).toEqual({});
    expect(originalCallCount).toBe(2);
  });
});
