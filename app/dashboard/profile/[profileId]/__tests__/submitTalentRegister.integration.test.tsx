import { act } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useFormContext } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TalentRegisterFormValues } from "@/schemas/talent/talentRegisterSchema";

import {
  renderSubmitTalentRegisterHarness,
  createIntegrationValues,
} from "./submitTalentRegister.integration.helpers";
import {
  resetIntegrationMocks,
  routerPushMock,
  showToastMock,
} from "./submitTalentRegister.integration.mocks";
import ActivitiesSection from "../_components/sections/ActivitiesSection";
import CareerSection from "../_components/sections/CareerSection";
import CertificatesSection from "../_components/sections/CertificatesSection";
import EducationSection from "../_components/sections/EducationSection";
import LanguagesSection from "../_components/sections/LanguagesSection";

function JobDirtyFieldsInputs() {
  const { setValue, watch } = useFormContext<TalentRegisterFormValues>();
  const role = watch("job.role");

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setValue("job.role", "frontend", { shouldValidate: true, shouldDirty: true });
        }}
      >
        set frontend role
      </button>
      <span>{role}</span>
    </div>
  );
}

function ExpTagsDirtyFieldsInputs() {
  const { setValue, watch } = useFormContext<TalentRegisterFormValues>();
  const experiences = watch("job.experiences");

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setValue("job.experiences", ["bootcamp", "major"], {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
      >
        set bootcamp and major
      </button>
      <span>{experiences?.join(",")}</span>
    </div>
  );
}

describe("submitTalentRegister integration harness (T1)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
  });

  it("FormProvider 와 TalentRegisterNav 를 최소 하네스로 렌더링한다", () => {
    renderSubmitTalentRegisterHarness({
      children: <div>integration section</div>,
      initialValues: createIntegrationValues(),
    });

    expect(screen.getByRole("button", { name: "임시 저장" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "작성 완료" })).toBeInTheDocument();
    expect(screen.getByText("integration section")).toBeInTheDocument();
  });

  it("뒤로가기 버튼 클릭 시 profile 페이지로 이동한다", async () => {
    const { user } = renderSubmitTalentRegisterHarness({
      children: <div>integration section</div>,
      initialValues: createIntegrationValues(),
    });

    await user.click(screen.getByRole("button", { name: "이전 페이지" }));

    expect(routerPushMock).toHaveBeenCalledWith("/profile");
  });
});

describe("TalentRegisterNav integration (T2)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("임시저장 버튼을 연속 클릭해도 마지막 클릭 기준 1초 뒤에 저장을 1회만 실행한다", async () => {
    const onTempSave = vi.fn().mockResolvedValue({ success: true });
    renderSubmitTalentRegisterHarness({
      initialValues: createIntegrationValues(),
      onTempSave,
    });

    const button = screen.getByRole("button", { name: "임시 저장" });

    fireEvent.click(button);
    await vi.advanceTimersByTimeAsync(900);
    fireEvent.click(button);
    await vi.advanceTimersByTimeAsync(999);

    expect(onTempSave).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(onTempSave).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });

  it("temp-save validation 이 실패하면 저장을 막고 에러 토스트를 띄운다", async () => {
    const onTempSave = vi.fn().mockResolvedValue(undefined);
    const invalidValues = createIntegrationValues({
      educations: [
        {
          schoolName: "연성대학교",
          major: "",
          status: "" as "" | "ENROLLED" | "GRADUATED" | "COMPLETED",
          startDate: "",
          endDate: "",
          description: "",
          degree: "",
        },
      ],
    });

    renderSubmitTalentRegisterHarness({
      initialValues: invalidValues,
      onTempSave,
    });

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(onTempSave).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenLastCalledWith(expect.any(String), "error");
  });
});

describe("EducationSection integration (T3)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("첫 임시저장으로 생성된 학력은 reset 이후 다시 임시저장해도 중복 POST 되지 않는다", async () => {
    const educationsApi = await import("@/lib/api/educations");

    vi.mocked(educationsApi.createEducations).mockResolvedValueOnce([
      {
        id: 101,
        schoolName: "연성대학교",
        major: "컴퓨터공학",
        status: "GRADUATED",
        startDate: "2020-03-01",
        endDate: "2024-02-01",
        description: "",
        degree: "",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);

    renderSubmitTalentRegisterHarness({
      children: <EducationSection profileId={1} />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "학력 추가" }));

    const schoolNameInputs = screen.getAllByPlaceholderText("학교명을 입력해주세요");
    const majorInputs = screen.getAllByPlaceholderText("전공을 입력해주세요");

    fireEvent.change(schoolNameInputs[1], { target: { value: "연성대학교" } });
    fireEvent.change(majorInputs[1], { target: { value: "컴퓨터공학" } });

    fireEvent.change(document.getElementById("educations-1-start-date")!, {
      target: { value: "2020-03" },
    });
    fireEvent.change(document.getElementById("educations-1-end-date")!, {
      target: { value: "2024-02" },
    });
    fireEvent.change(document.getElementById("educations-1-status")!, {
      target: { value: "GRADUATED" },
    });

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(educationsApi.createEducations).toHaveBeenCalledTimes(1);
    expect(educationsApi.createEducations).toHaveBeenCalledWith(1, [
      {
        schoolName: "연성대학교",
        major: "컴퓨터공학",
        status: "GRADUATED",
        startDate: "2020-03-01",
        endDate: "2024-02-01",
        description: "",
        degree: "",
      },
    ]);

    vi.mocked(educationsApi.createEducations).mockClear();
    vi.mocked(educationsApi.updateEducation).mockClear();
    showToastMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(educationsApi.createEducations).not.toHaveBeenCalled();
    expect(educationsApi.updateEducation).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });
});

describe("EducationSection integration (T4)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
  });

  it("기존 학력을 삭제하면 다음 임시저장에서 삭제된 항목을 다시 저장하지 않는다", async () => {
    const educationsApi = await import("@/lib/api/educations");

    renderSubmitTalentRegisterHarness({
      children: <EducationSection profileId={1} />,
      initialValues: createIntegrationValues({
        educations: [
          {
            id: 77,
            schoolName: "연성대학교",
            major: "컴퓨터공학",
            status: "GRADUATED",
            startDate: "2020-03",
            endDate: "2024-02",
            description: "",
            degree: "",
          },
        ],
      }),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => {
      expect(educationsApi.deleteEducation).toHaveBeenCalledWith(1, 77);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    });

    vi.mocked(educationsApi.createEducations).mockClear();
    vi.mocked(educationsApi.updateEducation).mockClear();
    showToastMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await new Promise((resolve) => {
      setTimeout(resolve, 1100);
    });

    expect(educationsApi.createEducations).not.toHaveBeenCalled();
    expect(educationsApi.updateEducation).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });

  it("학력 삭제 API 가 실패하면 항목을 유지하고 에러 메시지를 보여준다", async () => {
    const educationsApi = await import("@/lib/api/educations");

    vi.mocked(educationsApi.deleteEducation).mockRejectedValueOnce(
      new Error("학력 삭제에 실패했습니다.")
    );

    renderSubmitTalentRegisterHarness({
      children: <EducationSection profileId={1} />,
      initialValues: createIntegrationValues({
        educations: [
          {
            id: 77,
            schoolName: "연성대학교",
            major: "컴퓨터공학",
            status: "GRADUATED",
            startDate: "2020-03",
            endDate: "2024-02",
            description: "",
            degree: "",
          },
        ],
      }),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => {
      expect(educationsApi.deleteEducation).toHaveBeenCalledWith(1, 77);
    });

    expect(screen.getByText("학력 삭제에 실패했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });
});

describe("CareerSection integration (T8)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("첫 임시저장으로 생성된 경력은 reset 이후 다시 임시저장해도 중복 POST 하지 않는다", async () => {
    const experiencesApi = await import("@/lib/api/experiences");

    vi.mocked(experiencesApi.createExperiences).mockResolvedValueOnce([
      {
        id: 201,
        companyName: "멋사컴퍼니",
        department: "Platform",
        position: "Frontend Engineer",
        startDate: "2023-01-01",
        endDate: null,
        isCurrent: false,
        description: "프론트엔드 개발",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);

    renderSubmitTalentRegisterHarness({
      children: <CareerSection profileId={1} />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "경력 추가" }));

    fireEvent.change(document.getElementById("careers-0-company")!, {
      target: { value: "멋사컴퍼니" },
    });
    fireEvent.change(document.getElementById("careers-0-department")!, {
      target: { value: "Platform" },
    });
    fireEvent.change(document.getElementById("careers-0-position")!, {
      target: { value: "Frontend Engineer" },
    });
    fireEvent.change(document.getElementById("careers-0-start-date")!, {
      target: { value: "2023-01" },
    });
    fireEvent.change(document.getElementById("careers-0-description")!, {
      target: { value: "프론트엔드 개발" },
    });

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(experiencesApi.createExperiences).toHaveBeenCalledTimes(1);
    expect(experiencesApi.createExperiences).toHaveBeenCalledWith(1, [
      {
        companyName: "멋사컴퍼니",
        department: "Platform",
        position: "Frontend Engineer",
        startDate: "2023-01-01",
        endDate: undefined,
        isCurrent: false,
        description: "프론트엔드 개발",
      },
    ]);

    vi.mocked(experiencesApi.createExperiences).mockClear();
    vi.mocked(experiencesApi.updateExperience).mockClear();
    showToastMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(experiencesApi.createExperiences).not.toHaveBeenCalled();
    expect(experiencesApi.updateExperience).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });
});

describe("ActivitiesSection integration (T9)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("첫 임시저장으로 생성된 활동은 reset 이후 다시 임시저장해도 중복 POST 하지 않는다", async () => {
    const awardsApi = await import("@/lib/api/awards");

    vi.mocked(awardsApi.createAwards).mockResolvedValueOnce([
      {
        id: 301,
        title: "멋사 해커톤 수상",
        organization: "default",
        awardDate: "2024-09-01",
        description: "대상 수상",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);

    renderSubmitTalentRegisterHarness({
      children: <ActivitiesSection profileId={1} />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "활동 추가" }));

    fireEvent.change(document.getElementById("activities-0-title")!, {
      target: { value: "멋사 해커톤 수상" },
    });
    fireEvent.change(document.getElementById("activities-0-award-date")!, {
      target: { value: "2024-09" },
    });
    fireEvent.change(document.getElementById("activities-0-description")!, {
      target: { value: "대상 수상" },
    });

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(awardsApi.createAwards).toHaveBeenCalledTimes(1);
    expect(awardsApi.createAwards).toHaveBeenCalledWith(1, [
      {
        title: "멋사 해커톤 수상",
        organization: "default",
        awardDate: "2024-09-01",
        description: "대상 수상",
      },
    ]);

    vi.mocked(awardsApi.createAwards).mockClear();
    vi.mocked(awardsApi.updateAward).mockClear();
    showToastMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(awardsApi.createAwards).not.toHaveBeenCalled();
    expect(awardsApi.updateAward).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });
});

describe("LanguagesSection integration (T10)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("첫 임시저장으로 생성된 언어는 reset 이후 다시 임시저장해도 중복 POST 하지 않는다", async () => {
    const languagesApi = await import("@/lib/api/languages");

    vi.mocked(languagesApi.createLanguages).mockResolvedValueOnce([
      {
        id: 401,
        languageName: "TOEIC",
        level: "default",
        issueDate: "2024-08-01",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);

    renderSubmitTalentRegisterHarness({
      children: <LanguagesSection profileId={1} />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "언어 추가" }));

    fireEvent.change(document.getElementById("languages-0-name")!, {
      target: { value: "TOEIC" },
    });
    fireEvent.change(document.getElementById("languages-0-issue-date")!, {
      target: { value: "2024-08" },
    });

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(languagesApi.createLanguages).toHaveBeenCalledTimes(1);
    expect(languagesApi.createLanguages).toHaveBeenCalledWith(1, [
      {
        languageName: "TOEIC",
        level: "default",
        issueDate: "2024-08-01",
      },
    ]);

    vi.mocked(languagesApi.createLanguages).mockClear();
    vi.mocked(languagesApi.updateLanguage).mockClear();
    showToastMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(languagesApi.createLanguages).not.toHaveBeenCalled();
    expect(languagesApi.updateLanguage).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });
});

describe("CertificatesSection integration (T11)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("첫 임시저장으로 생성된 자격증은 reset 이후 다시 임시저장해도 중복 POST 하지 않는다", async () => {
    const certificationsApi = await import("@/lib/api/certifications");

    vi.mocked(certificationsApi.createCertifications).mockResolvedValueOnce([
      {
        id: 501,
        name: "AWS SAA",
        issuer: "default",
        issueDate: "2025-01-01",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);

    renderSubmitTalentRegisterHarness({
      children: <CertificatesSection profileId={1} />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "자격증 추가" }));

    fireEvent.change(document.getElementById("certificates-0-name")!, {
      target: { value: "AWS SAA" },
    });
    fireEvent.change(document.getElementById("certificates-0-issue-date")!, {
      target: { value: "2025-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(certificationsApi.createCertifications).toHaveBeenCalledTimes(1);
    expect(certificationsApi.createCertifications).toHaveBeenCalledWith(1, [
      {
        name: "AWS SAA",
        issuer: "default",
        issueDate: "2025-01-01",
      },
    ]);

    vi.mocked(certificationsApi.createCertifications).mockClear();
    vi.mocked(certificationsApi.updateCertification).mockClear();
    showToastMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(certificationsApi.createCertifications).not.toHaveBeenCalled();
    expect(certificationsApi.updateCertification).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });
});

describe("expTags dirtyFields integration (T12)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("job.experiences 를 바꾸지 않고 임시저장하면 updateExpTags 를 호출하지 않는다", async () => {
    const expTagsApi = await import("@/lib/api/expTags");

    renderSubmitTalentRegisterHarness({
      children: <ExpTagsDirtyFieldsInputs />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(expTagsApi.updateExpTags).not.toHaveBeenCalled();
  });

  it("job.experiences 를 변경하고 임시저장하면 expTag ID payload 로 updateExpTags 를 호출한다", async () => {
    const expTagsApi = await import("@/lib/api/expTags");

    renderSubmitTalentRegisterHarness({
      children: <ExpTagsDirtyFieldsInputs />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set bootcamp and major" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(expTagsApi.updateExpTags).toHaveBeenCalledTimes(1);
    expect(expTagsApi.updateExpTags).toHaveBeenCalledWith(1, { ids: [1, 4] });
  });

  it("job.experiences 를 바꾼 뒤 성공적으로 임시저장하면 reset 이후 다시 저장해도 현재 dirty 상태가 유지되어 updateExpTags 를 다시 호출한다", async () => {
    const expTagsApi = await import("@/lib/api/expTags");

    renderSubmitTalentRegisterHarness({
      children: <ExpTagsDirtyFieldsInputs />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set bootcamp and major" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(expTagsApi.updateExpTags).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(expTagsApi.updateExpTags).toHaveBeenCalledTimes(2);
    expect(expTagsApi.updateExpTags).toHaveBeenNthCalledWith(2, 1, { ids: [1, 4] });
  });
});

describe("jobs dirtyFields integration (T5)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("job 값을 바꾸지 않고 임시저장하면 updateJobs 를 호출하지 않는다", async () => {
    const jobsApi = await import("@/lib/api/jobs");

    renderSubmitTalentRegisterHarness({
      children: <JobDirtyFieldsInputs />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(jobsApi.updateJobs).not.toHaveBeenCalled();
  });

  it("job.role 을 변경한 뒤 임시저장하면 role id payload 로 updateJobs 를 호출한다", async () => {
    const jobsApi = await import("@/lib/api/jobs");

    renderSubmitTalentRegisterHarness({
      children: <JobDirtyFieldsInputs />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set frontend role" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(jobsApi.updateJobs).toHaveBeenCalledTimes(1);
    expect(jobsApi.updateJobs).toHaveBeenCalledWith(1, { ids: [1] });
  });

  it("job.role 을 변경한 뒤 성공적으로 임시저장하면 reset 이후 다시 저장해도 현재 dirty 상태가 유지되어 updateJobs 를 다시 호출한다", async () => {
    const jobsApi = await import("@/lib/api/jobs");

    renderSubmitTalentRegisterHarness({
      children: <JobDirtyFieldsInputs />,
      initialValues: createIntegrationValues(),
      profileId: 1,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set frontend role" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(jobsApi.updateJobs).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(jobsApi.updateJobs).toHaveBeenCalledTimes(2);
    expect(jobsApi.updateJobs).toHaveBeenNthCalledWith(2, 1, { ids: [1] });
  });
});

describe("temp-save toast integration (T6)", () => {
  beforeEach(() => {
    resetIntegrationMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("임시저장이 성공하면 성공 토스트는 한 번만 노출된다", async () => {
    const onTempSave = vi.fn().mockResolvedValue({ success: true });

    renderSubmitTalentRegisterHarness({
      initialValues: createIntegrationValues(),
      onTempSave,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(onTempSave).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("임시 저장되었습니다!");
  });

  it("임시저장이 실패하면 성공 토스트를 노출하지 않는다", async () => {
    const onTempSave = vi.fn().mockResolvedValue({ success: false, error: new Error("boom") });

    renderSubmitTalentRegisterHarness({
      initialValues: createIntegrationValues(),
      onTempSave,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(onTempSave).toHaveBeenCalledTimes(1);
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
