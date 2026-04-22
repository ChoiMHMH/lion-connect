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

/**
 * 경력 섹션 분기 로직
 *
 * - defaultValues.careers 에 있던 id + 값 변경 → PUT (updateExperience)
 * - defaultValues.careers 에 없던 항목 → POST (createExperiences, 배치)
 * - companyName/position 둘 다 빈 값 → skip (유효성 필터)
 */
describe("submitTalentRegister — 경력 분기 (T1 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type CareerItem = NonNullable<TalentRegisterFormValues["careers"]>[number];

  function buildValues(careers: CareerItem[]): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.careers = careers;
    return v;
  }

  it("기존 변경 1개 + 신규 1개 → updateExperience 1회, createExperiences 1회(payload·반환 data 반영)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const experiencesApi = await import("@/lib/api/experiences");

    const original: CareerItem[] = [
      {
        id: 20,
        companyName: "이전회사",
        department: "Platform",
        position: "Engineer",
        startDate: "2020-01",
        endDate: "2022-12",
        isCurrent: false,
        description: "before",
      },
      {
        id: 21,
        companyName: "그대로회사",
        department: "Frontend",
        position: "Developer",
        startDate: "2023-01",
        endDate: "",
        isCurrent: true,
        description: "",
      },
    ];
    const current: CareerItem[] = [
      {
        ...original[0],
        companyName: "변경회사",
        endDate: "",
        isCurrent: true,
        description: "changed",
      },
      { ...original[1] },
      {
        companyName: "신규회사",
        department: "",
        position: "Junior Engineer",
        startDate: "2025-01",
        endDate: "",
        description: "",
      },
    ];

    vi.mocked(experiencesApi.updateExperience).mockResolvedValueOnce({
      id: 200,
      companyName: "변경회사",
      department: "Platform",
      position: "Engineer",
      startDate: "2020-01-01",
      endDate: null,
      isCurrent: true,
      description: "changed",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(experiencesApi.createExperiences).mockResolvedValueOnce([
      {
        id: 300,
        companyName: "신규회사",
        department: null,
        position: "Junior Engineer",
        startDate: "2025-01-01",
        endDate: null,
        isCurrent: false,
        description: null,
        createdAt: "",
        updatedAt: "",
      },
    ]);

    const values = buildValues(current);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), careers: original },
    });

    const res = await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(experiencesApi.updateExperience).toHaveBeenCalledTimes(1);
    expect(experiencesApi.updateExperience).toHaveBeenCalledWith(1, 20, {
      companyName: "변경회사",
      department: "Platform",
      position: "Engineer",
      startDate: "2020-01-01",
      endDate: undefined,
      isCurrent: true,
      description: "changed",
    });

    expect(experiencesApi.createExperiences).toHaveBeenCalledTimes(1);
    expect(experiencesApi.createExperiences).toHaveBeenCalledWith(1, [
      {
        companyName: "신규회사",
        department: "",
        position: "Junior Engineer",
        startDate: "2025-01-01",
        endDate: undefined,
        isCurrent: false,
        description: "",
      },
    ]);

    expect(res.success).toBe(true);
    expect(res.data?.careers?.[0]).toMatchObject({
      id: 200,
      companyName: "변경회사",
      startDate: "2020-01",
      endDate: "",
      isCurrent: true,
      description: "changed",
    });
    expect(res.data?.careers?.[2]).toMatchObject({
      id: 300,
      companyName: "신규회사",
      department: "",
      position: "Junior Engineer",
      startDate: "2025-01",
      endDate: "",
      isCurrent: false,
      description: "",
    });
  });

  it("신규 항목이 companyName/position 모두 빈 값 → 호출 0회 (유효성 필터)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const experiencesApi = await import("@/lib/api/experiences");

    const values = buildValues([
      {
        companyName: "",
        department: "빈 부서",
        position: "",
        startDate: "2025-01",
        endDate: "",
        isCurrent: false,
        description: "필수값 없음",
      },
    ]);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), careers: [] },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(experiencesApi.updateExperience).not.toHaveBeenCalled();
    expect(experiencesApi.createExperiences).not.toHaveBeenCalled();
  });
});

/**
 * 수상/활동 섹션 분기 로직
 *
 * - defaultValues.activities 에 있던 id + 값 변경 → PUT (updateAward)
 * - defaultValues.activities 에 없던 항목 → POST (createAwards, 배치)
 * - title 이 빈 값 → skip (유효성 필터)
 */
describe("submitTalentRegister — 활동 분기 (T2 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type ActivityItem = NonNullable<TalentRegisterFormValues["activities"]>[number];

  function buildValues(activities: ActivityItem[]): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.activities = activities;
    return v;
  }

  it("기존 변경 1개 + 신규 1개 → updateAward 1회, createAwards 1회(payload·반환 data 반영)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const awardsApi = await import("@/lib/api/awards");

    const original: ActivityItem[] = [
      {
        id: 40,
        title: "이전 활동",
        awardDate: "2024-01",
        description: "before",
      },
      {
        id: 41,
        title: "그대로 활동",
        awardDate: "2024-02",
        description: "",
      },
    ];
    const current: ActivityItem[] = [
      {
        ...original[0],
        title: "변경 활동",
        awardDate: "2024-03",
        description: "changed",
      },
      { ...original[1] },
      {
        title: "신규 활동",
        awardDate: "2025-01",
        description: "",
      },
    ];

    vi.mocked(awardsApi.updateAward).mockResolvedValueOnce({
      id: 400,
      title: "변경 활동",
      organization: "default",
      awardDate: "2024-03-01",
      description: "changed",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(awardsApi.createAwards).mockResolvedValueOnce([
      {
        id: 500,
        title: "신규 활동",
        organization: "default",
        awardDate: "2025-01-01",
        description: "",
        createdAt: "",
        updatedAt: "",
      },
    ]);

    const values = buildValues(current);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), activities: original },
    });

    const res = await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(awardsApi.updateAward).toHaveBeenCalledTimes(1);
    expect(awardsApi.updateAward).toHaveBeenCalledWith(1, 40, {
      title: "변경 활동",
      organization: "default",
      awardDate: "2024-03-01",
      description: "changed",
    });

    expect(awardsApi.createAwards).toHaveBeenCalledTimes(1);
    expect(awardsApi.createAwards).toHaveBeenCalledWith(1, [
      {
        title: "신규 활동",
        organization: "default",
        awardDate: "2025-01-01",
        description: "",
      },
    ]);

    expect(res.success).toBe(true);
    expect(res.data?.activities?.[0]).toMatchObject({
      id: 400,
      title: "변경 활동",
      awardDate: "2024-03",
      description: "changed",
    });
    expect(res.data?.activities?.[2]).toMatchObject({
      id: 500,
      title: "신규 활동",
      awardDate: "2025-01",
      description: "",
    });
  });

  it("신규 항목이 title 빈 값 → 호출 0회 (유효성 필터)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const awardsApi = await import("@/lib/api/awards");

    const values = buildValues([
      {
        title: "",
        awardDate: "2025-01",
        description: "제목 없음",
      },
    ]);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), activities: [] },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(awardsApi.updateAward).not.toHaveBeenCalled();
    expect(awardsApi.createAwards).not.toHaveBeenCalled();
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

    // updateProfile 이 parallel 섹션 이후 순차로 호출됨
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
    // parallel 단계에서 실패했으므로 최종 updateProfile 에 도달하지 않음
    expect(profilesApi.updateProfile).not.toHaveBeenCalled();
  });
});
