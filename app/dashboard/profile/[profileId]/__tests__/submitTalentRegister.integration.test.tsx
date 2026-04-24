import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  renderSubmitTalentRegisterHarness,
  createIntegrationValues,
} from "./submitTalentRegister.integration.helpers";
import { resetIntegrationMocks, routerPushMock } from "./submitTalentRegister.integration.mocks";

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
