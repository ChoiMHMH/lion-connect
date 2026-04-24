/**
 * submitTalentRegister 테스트 — 공통 플로우
 *
 * 섹션별 CRUD 분기는 별도 파일에서 다룬다.
 * - 배열형 섹션: submitTalentRegister.arraySections.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMethods, cloneDefaultValues } from "./submitTalentRegister.helpers";
import "./submitTalentRegister.mocks";

describe("submitTalentRegister — 헬퍼·모킹 sanity (T5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("도메인 API 가 모두 mock 으로 대체되었다 (updateProfile 초기 호출 수 0)", async () => {
    const profilesApi = await import("@/lib/api/profiles");
    expect(vi.isMockFunction(profilesApi.updateProfile)).toBe(true);
    expect(profilesApi.updateProfile).toHaveBeenCalledTimes(0);
  });

  it("makeMethods 가 UseFormReturn 의 필요 필드(dirtyFields, defaultValues, getValues)를 제공한다", () => {
    const values = cloneDefaultValues();
    values.profile.name = "민혁";
    const methods = makeMethods({
      values,
      defaultValues: { profile: { ...values.profile, name: "" } },
      dirtyFields: { profile: { name: true } },
    });

    expect(methods.formState.dirtyFields).toEqual({ profile: { name: true } });
    expect(methods.formState.defaultValues?.profile?.name).toBe("");
    expect(methods.getValues()).toEqual(values);
    expect(methods.getValues("skills.main" as never)).toEqual(values.skills.main);
  });
});

/**
 * 공통 플로우 (T7): 업로드 순서 · status 처리 · 실패 처리
 */
describe("submitTalentRegister — 업로드 순서·status·실패 처리 (T7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("avatar File 업로드는 presign → S3 → complete → upsertThumbnailLink 순서로 호출된다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const thumbnailApi = await import("@/lib/api/profileThumbnail");

    const values = cloneDefaultValues();
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    values.profile.avatar = file;

    const methods = makeMethods({
      values,
      defaultValues: cloneDefaultValues(),
      dirtyFields: { profile: { avatar: true } },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    const presignOrder = vi.mocked(thumbnailApi.presignThumbnail).mock.invocationCallOrder[0];
    const s3Order = vi.mocked(thumbnailApi.uploadThumbnailToS3).mock.invocationCallOrder[0];
    const completeOrder = vi.mocked(thumbnailApi.completeThumbnailUpload).mock
      .invocationCallOrder[0];
    const linkOrder = vi.mocked(thumbnailApi.upsertThumbnailLink).mock.invocationCallOrder[0];

    expect(presignOrder).toBeDefined();
    expect(presignOrder).toBeLessThan(s3Order);
    expect(s3Order).toBeLessThan(completeOrder);
    expect(completeOrder).toBeLessThan(linkOrder);
  });

  it("isTempSave: true → 최종 updateProfile 의 status 는 DRAFT", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const profilesApi = await import("@/lib/api/profiles");

    const values = cloneDefaultValues();
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    const res = await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(res.success).toBe(true);
    expect(profilesApi.updateProfile).toHaveBeenCalledTimes(1);
    const [, payload] = vi.mocked(profilesApi.updateProfile).mock.calls[0];
    expect(payload.status).toBe("DRAFT");
  });

  it("isTempSave: false → status 는 COMPLETED 이고 updateProfile 이 가장 마지막에 호출된다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const profilesApi = await import("@/lib/api/profiles");
    const customSkillsApi = await import("@/lib/api/customSkills");

    // 기본값은 skills.main 이 빈 배열이라 updateCustomSkills 가 항상 호출됨
    // (submit 코드가 빈 배열이라도 "모든 스킬 삭제" 용도로 호출)
    const values = cloneDefaultValues();
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: false });

    const [, profilePayload] = vi.mocked(profilesApi.updateProfile).mock.calls[0];
    expect(profilePayload.status).toBe("COMPLETED");

    const profileOrder = vi.mocked(profilesApi.updateProfile).mock.invocationCallOrder[0];
    const skillsOrder = vi.mocked(customSkillsApi.updateCustomSkills).mock.invocationCallOrder[0];
    expect(skillsOrder).toBeLessThan(profileOrder);
  });

  it("parallelPromises 중 1개가 reject → submitTalentRegister 는 { success: false, error } 반환 (전체 실패)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const customSkillsApi = await import("@/lib/api/customSkills");
    const profilesApi = await import("@/lib/api/profiles");

    const boom = new Error("skills failed");
    vi.mocked(customSkillsApi.updateCustomSkills).mockRejectedValueOnce(boom);

    const values = cloneDefaultValues();
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    const res = await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(res.success).toBe(false);
    expect(res.error).toBe(boom);
    expect(profilesApi.updateProfile).not.toHaveBeenCalled();
  });
});
