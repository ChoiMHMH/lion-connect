/**
 * submitTalentRegister 테스트 — T5 헬퍼/모킹 sanity
 *
 * 본 파일은 이후 task (T6: 학력 분기, T7: 업로드 순서·status·실패) 의 베이스.
 * - 도메인 API 가 모두 vi.mock 으로 대체되었는지
 * - makeMethods 헬퍼가 기대대로 동작하는지
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMethods, cloneDefaultValues } from "./submitTalentRegister.helpers";

// 도메인 API 전부 모킹 (실제 네트워크 호출 차단)
vi.mock("@/lib/api/profiles", () => ({
  updateProfile: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/educations", () => ({
  createEducations: vi.fn().mockResolvedValue([]),
  updateEducation: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/experiences", () => ({
  createExperiences: vi.fn().mockResolvedValue([]),
  updateExperience: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/languages", () => ({
  createLanguages: vi.fn().mockResolvedValue([]),
  updateLanguage: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/certifications", () => ({
  createCertifications: vi.fn().mockResolvedValue([]),
  updateCertification: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/awards", () => ({
  createAwards: vi.fn().mockResolvedValue([]),
  updateAward: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/expTags", () => ({
  updateExpTags: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/jobs", () => ({
  updateJobs: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/customSkills", () => ({
  updateCustomSkills: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/profileThumbnail", () => ({
  presignThumbnail: vi.fn().mockResolvedValue({ uploadUrl: "u", objectKey: "o", fileUrl: "f" }),
  uploadThumbnailToS3: vi.fn().mockResolvedValue(undefined),
  completeThumbnailUpload: vi.fn().mockResolvedValue({}),
  upsertThumbnailLink: vi.fn().mockResolvedValue({}),
  upsertProfileLink: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/profilePortfolio", () => ({
  presignPortfolio: vi.fn().mockResolvedValue({ uploadUrl: "u", objectKey: "o", fileUrl: "f" }),
  uploadPortfolioToS3: vi.fn().mockResolvedValue(undefined),
  completePortfolioUpload: vi.fn().mockResolvedValue({
    fileUrl: "f",
    originalFilename: "p.pdf",
    contentType: "application/pdf",
    fileSize: 100,
  }),
}));
vi.mock("@/lib/api/workDriven", () => ({
  submitWorkDrivenTest: vi.fn().mockResolvedValue({}),
}));

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
    // 점 경로 접근
    expect(methods.getValues("skills.main" as never)).toEqual(values.skills.main);
  });
});
