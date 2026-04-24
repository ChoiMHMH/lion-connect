import "./submitTalentRegister.integration.mocks";

import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";

import type { TalentRegisterFormValues } from "@/schemas/talent/talentRegisterSchema";
import { useToastStore } from "@/store/toastStore";

import { cloneDefaultValues } from "../_actions/__tests__/submitTalentRegister.helpers";
import { submitTalentRegister } from "../_actions/submitTalentRegister";
import TalentRegisterNav from "../_components/TalentRegisterNav";

interface TempSaveHandlerParams {
  methods: UseFormReturn<TalentRegisterFormValues>;
  profileId: number;
  values: TalentRegisterFormValues;
}

interface RenderHarnessOptions {
  children?: ReactNode;
  initialValues?: TalentRegisterFormValues;
  isSubmitDisabled?: boolean;
  onTempSave?: (params: TempSaveHandlerParams) => Promise<unknown> | unknown;
  profileId?: number;
}

interface HarnessProps extends RenderHarnessOptions {
  formId: string;
}

function isTempSaveResult(
  value: unknown
): value is { success: boolean; data?: TalentRegisterFormValues } {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as { success: unknown }).success === "boolean"
  );
}

function SubmitTalentRegisterIntegrationHarness({
  children,
  formId,
  initialValues,
  isSubmitDisabled = false,
  onTempSave,
  profileId = 1,
}: HarnessProps) {
  const methods = useForm<TalentRegisterFormValues>({
    defaultValues: initialValues ?? cloneDefaultValues(),
  });
  const showToast = useToastStore((state) => state.showToast);

  const handleTempSave = async () => {
    const values = methods.getValues();
    const result = onTempSave
      ? await onTempSave({ values, methods, profileId })
      : await submitTalentRegister({
          values,
          methods,
          profileId,
          isTempSave: true,
        });

    if (isTempSaveResult(result) && result.success) {
      if (result.data) {
        // page.tsx 와 같은 reset 옵션을 유지해 재저장 흐름을 재현한다.
        methods.reset(result.data, { keepDirty: true, keepTouched: true, keepErrors: true });
      }
      showToast("임시 저장되었습니다!");
    }

    return result;
  };

  return (
    <FormProvider {...methods}>
      <TalentRegisterNav
        formId={formId}
        isSubmitDisabled={isSubmitDisabled}
        onTempSave={handleTempSave}
      />
      <form id={formId}>{children}</form>
    </FormProvider>
  );
}

export function createIntegrationValues(overrides?: Partial<TalentRegisterFormValues>) {
  return {
    ...cloneDefaultValues(),
    ...overrides,
  } as TalentRegisterFormValues;
}

export function renderSubmitTalentRegisterHarness(
  { children, initialValues, isSubmitDisabled, onTempSave, profileId }: RenderHarnessOptions = {},
  userOptions?: Parameters<typeof userEvent.setup>[0]
) {
  const user = userEvent.setup(userOptions);
  const formId = "submit-talent-register-integration-form";

  return {
    user,
    ...render(
      <SubmitTalentRegisterIntegrationHarness
        formId={formId}
        initialValues={initialValues}
        isSubmitDisabled={isSubmitDisabled}
        onTempSave={onTempSave}
        profileId={profileId}
      >
        {children}
      </SubmitTalentRegisterIntegrationHarness>
    ),
  };
}
