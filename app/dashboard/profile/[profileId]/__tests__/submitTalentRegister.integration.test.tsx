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
import EducationSection from "../_components/sections/EducationSection";

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
