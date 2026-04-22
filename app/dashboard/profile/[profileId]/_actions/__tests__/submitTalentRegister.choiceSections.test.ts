import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TalentRegisterFormValues } from "@/schemas/talent/talentRegisterSchema";
import { makeMethods, cloneDefaultValues } from "./submitTalentRegister.helpers";
import "./submitTalentRegister.mocks";

/**
 * 링크 섹션 분기 로직
 *
 * - url 이 있는 링크만 type 별 PUT upsert
 * - 빈 url 또는 type 없는 링크는 skip
 */
describe("submitTalentRegister — 링크 payload (T5 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildValues(links: TalentRegisterFormValues["links"]): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.links = links;
    return v;
  }

  it("URL 있는 링크만 upsertProfileLink PUT 호출하고 링크 payload 를 전송한다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const thumbnailApi = await import("@/lib/api/profileThumbnail");

    const values = buildValues([
      {
        type: "LINK",
        url: "https://github.com/example",
      },
      {
        type: "LINK2",
        url: "https://example.com/blog",
      },
      {
        type: "LINK3",
        url: "   ",
      },
      {
        url: "https://example.com/no-type",
      },
      {
        type: "LINK4",
        url: "",
      },
    ]);
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(thumbnailApi.upsertProfileLink).toHaveBeenCalledTimes(2);
    expect(thumbnailApi.upsertProfileLink).toHaveBeenNthCalledWith(
      1,
      1,
      "LINK",
      {
        type: "LINK",
        url: "https://github.com/example",
        originalFilename: "",
        contentType: "text/uri-list",
        fileSize: 0,
      },
      "PUT"
    );
    expect(thumbnailApi.upsertProfileLink).toHaveBeenNthCalledWith(
      2,
      1,
      "LINK2",
      {
        type: "LINK2",
        url: "https://example.com/blog",
        originalFilename: "",
        contentType: "text/uri-list",
        fileSize: 0,
      },
      "PUT"
    );
  });

  it("links 가 빈 배열이면 링크 저장 호출 0회", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const thumbnailApi = await import("@/lib/api/profileThumbnail");

    const values = buildValues([]);
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(thumbnailApi.upsertProfileLink).not.toHaveBeenCalled();
  });
});
