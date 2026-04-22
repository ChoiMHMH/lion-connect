/**
 * submitTalentRegister 테스트 — T5 헬퍼/모킹 sanity
 *
 * 본 파일은 이후 task (T6: 학력 분기, T7: 업로드 순서·status·실패) 의 베이스.
 * - 도메인 API 가 모두 vi.mock 으로 대체되었는지
 * - makeMethods 헬퍼가 기대대로 동작하는지
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TalentRegisterFormValues } from "@/schemas/talent/talentRegisterSchema";
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

/**
 * 학력 섹션 분기 로직 (T6)
 *
 * submitTalentRegister 는 dirtyFields 대신 값 비교로 분기:
 *   - defaultValues.educations 에 있던 id + 값 변경 → PUT (updateEducation)
 *   - defaultValues.educations 에 없던 항목 → POST (createEducations, 배치)
 *   - schoolName/major/degree 전부 빈 값 → skip (유효성 필터)
 */
describe("submitTalentRegister — 학력 분기 (T6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 학력 섹션만 검증하므로 values 의 다른 필드는 기본값 유지.
   * educations 만 override.
   */
  function buildValues(
    educations: TalentRegisterFormValues["educations"]
  ): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.educations = educations;
    return v;
  }

  it("기존 변경 1개 + 신규 1개 → updateEducation 1회, createEducations 1회(신규 1건)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const educationsApi = await import("@/lib/api/educations");

    const original = [
      {
        id: 10,
        schoolName: "연성",
        major: "CS",
        status: "ENROLLED" as const,
        startDate: "2020-03",
        endDate: "2024-02",
        description: "",
        degree: "",
      },
      {
        id: 11,
        schoolName: "멋사",
        major: "FE",
        status: "GRADUATED" as const,
        startDate: "2024-03",
        endDate: "2024-08",
        description: "",
        degree: "",
      },
    ];
    const current = [
      { ...original[0], schoolName: "연성대" }, // id 10 변경
      { ...original[1] }, // id 11 그대로
      {
        // 신규 (id 없음)
        schoolName: "코드잇",
        major: "FE",
        status: "ENROLLED" as const,
        startDate: "2025-01",
        endDate: "2025-06",
        description: "",
        degree: "",
      },
    ];

    const values = buildValues(current);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), educations: original },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(educationsApi.updateEducation).toHaveBeenCalledTimes(1);
    expect(educationsApi.updateEducation).toHaveBeenCalledWith(
      1,
      10,
      expect.objectContaining({ schoolName: "연성대" })
    );

    expect(educationsApi.createEducations).toHaveBeenCalledTimes(1);
    const [, newItems] = vi.mocked(educationsApi.createEducations).mock.calls[0];
    expect(newItems).toHaveLength(1);
    expect(newItems[0]).toMatchObject({ schoolName: "코드잇" });
  });

  it("모든 학력이 defaultValues 와 동일 → updateEducation/createEducations 호출 0회", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const educationsApi = await import("@/lib/api/educations");

    const items = [
      {
        id: 10,
        schoolName: "연성",
        major: "CS",
        status: "ENROLLED" as const,
        startDate: "2020-03",
        endDate: "2024-02",
        description: "",
        degree: "",
      },
    ];

    const values = buildValues(items);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), educations: items },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(educationsApi.updateEducation).not.toHaveBeenCalled();
    expect(educationsApi.createEducations).not.toHaveBeenCalled();
  });

  it("신규 항목이 schoolName/major/degree 전부 빈 값 → 호출 0회 (유효성 필터)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const educationsApi = await import("@/lib/api/educations");

    const current = [
      {
        // 완전 빈 신규 항목
        schoolName: "",
        major: "",
        status: "" as const,
        startDate: "",
        endDate: "",
        description: "",
        degree: "",
      },
    ];

    const values = buildValues(current);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), educations: [] },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(educationsApi.updateEducation).not.toHaveBeenCalled();
    expect(educationsApi.createEducations).not.toHaveBeenCalled();
  });
});
