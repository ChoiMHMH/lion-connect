import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TalentRegisterFormValues } from "@/schemas/talent/talentRegisterSchema";
import { makeMethods, cloneDefaultValues } from "./submitTalentRegister.helpers";
import "./submitTalentRegister.mocks";

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
      { ...original[0], schoolName: "연성대" },
      { ...original[1] },
      {
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
 * 언어 섹션 분기 로직
 *
 * - defaultValues.languages 에 있던 id + 값 변경 → PUT (updateLanguage)
 * - defaultValues.languages 에 없던 항목 → POST (createLanguages, 배치)
 * - languageName 이 빈 값 → skip (유효성 필터)
 */
describe("submitTalentRegister — 언어 분기 (T3 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type LanguageItem = NonNullable<TalentRegisterFormValues["languages"]>[number];

  function buildValues(languages: LanguageItem[]): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.languages = languages;
    return v;
  }

  it("기존 변경 1개 + 신규 1개 → updateLanguage 1회, createLanguages 1회(payload·반환 data 반영)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const languagesApi = await import("@/lib/api/languages");

    const original: LanguageItem[] = [
      {
        id: 60,
        languageName: "TOEIC",
        issueDate: "2024-01",
      },
      {
        id: 61,
        languageName: "OPIc",
        issueDate: "2024-02",
      },
    ];
    const current: LanguageItem[] = [
      {
        ...original[0],
        issueDate: "2024-03",
      },
      { ...original[1] },
      {
        languageName: "IELTS",
        issueDate: "2025-01",
      },
    ];

    vi.mocked(languagesApi.updateLanguage).mockResolvedValueOnce({
      id: 600,
      languageName: "TOEIC",
      level: "default",
      issueDate: "2024-03-01",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(languagesApi.createLanguages).mockResolvedValueOnce([
      {
        id: 700,
        languageName: "IELTS",
        level: "default",
        issueDate: "2025-01-01",
        createdAt: "",
        updatedAt: "",
      },
    ]);

    const values = buildValues(current);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), languages: original },
    });

    const res = await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(languagesApi.updateLanguage).toHaveBeenCalledTimes(1);
    expect(languagesApi.updateLanguage).toHaveBeenCalledWith(1, 60, {
      languageName: "TOEIC",
      level: "default",
      issueDate: "2024-03-01",
    });

    expect(languagesApi.createLanguages).toHaveBeenCalledTimes(1);
    expect(languagesApi.createLanguages).toHaveBeenCalledWith(1, [
      {
        languageName: "IELTS",
        level: "default",
        issueDate: "2025-01-01",
      },
    ]);

    expect(res.success).toBe(true);
    expect(res.data?.languages?.[0]).toMatchObject({
      id: 600,
      languageName: "TOEIC",
      issueDate: "2024-03",
    });
    expect(res.data?.languages?.[2]).toMatchObject({
      id: 700,
      languageName: "IELTS",
      issueDate: "2025-01",
    });
  });

  it("신규 항목이 languageName 빈 값 → 호출 0회 (유효성 필터)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const languagesApi = await import("@/lib/api/languages");

    const values = buildValues([
      {
        languageName: "",
        issueDate: "2025-01",
      },
    ]);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), languages: [] },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(languagesApi.updateLanguage).not.toHaveBeenCalled();
    expect(languagesApi.createLanguages).not.toHaveBeenCalled();
  });
});

/**
 * 자격증 섹션 분기 로직
 *
 * - defaultValues.certificates 에 있던 id + 값 변경 → PUT (updateCertification)
 * - defaultValues.certificates 에 없던 항목 → POST (createCertifications, 배치)
 * - name 이 빈 값 → skip (유효성 필터)
 */
describe("submitTalentRegister — 자격증 분기 (T4 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type CertificateItem = NonNullable<TalentRegisterFormValues["certificates"]>[number];

  function buildValues(certificates: CertificateItem[]): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.certificates = certificates;
    return v;
  }

  it("기존 변경 1개 + 신규 1개 → updateCertification 1회, createCertifications 1회(payload·반환 data 반영)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const certificationsApi = await import("@/lib/api/certifications");

    const original: CertificateItem[] = [
      {
        id: 80,
        name: "정보처리기사",
        issueDate: "2024-01",
      },
      {
        id: 81,
        name: "SQLD",
        issueDate: "2024-02",
      },
    ];
    const current: CertificateItem[] = [
      {
        ...original[0],
        issueDate: "2024-03",
      },
      { ...original[1] },
      {
        name: "AWS SAA",
        issueDate: "2025-01",
      },
    ];

    vi.mocked(certificationsApi.updateCertification).mockResolvedValueOnce({
      id: 800,
      name: "정보처리기사",
      issuer: "default",
      issueDate: "2024-03-01",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(certificationsApi.createCertifications).mockResolvedValueOnce([
      {
        id: 900,
        name: "AWS SAA",
        issuer: "default",
        issueDate: "2025-01-01",
        createdAt: "",
        updatedAt: "",
      },
    ]);

    const values = buildValues(current);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), certificates: original },
    });

    const res = await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(certificationsApi.updateCertification).toHaveBeenCalledTimes(1);
    expect(certificationsApi.updateCertification).toHaveBeenCalledWith(1, 80, {
      name: "정보처리기사",
      issuer: "default",
      issueDate: "2024-03-01",
    });

    expect(certificationsApi.createCertifications).toHaveBeenCalledTimes(1);
    expect(certificationsApi.createCertifications).toHaveBeenCalledWith(1, [
      {
        name: "AWS SAA",
        issuer: "default",
        issueDate: "2025-01-01",
      },
    ]);

    expect(res.success).toBe(true);
    expect(res.data?.certificates?.[0]).toMatchObject({
      id: 800,
      name: "정보처리기사",
      issueDate: "2024-03",
    });
    expect(res.data?.certificates?.[2]).toMatchObject({
      id: 900,
      name: "AWS SAA",
      issueDate: "2025-01",
    });
  });

  it("신규 항목이 name 빈 값 → 호출 0회 (유효성 필터)", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const certificationsApi = await import("@/lib/api/certifications");

    const values = buildValues([
      {
        name: "",
        issueDate: "2025-01",
      },
    ]);
    const methods = makeMethods({
      values,
      defaultValues: { ...cloneDefaultValues(), certificates: [] },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(certificationsApi.updateCertification).not.toHaveBeenCalled();
    expect(certificationsApi.createCertifications).not.toHaveBeenCalled();
  });
});
