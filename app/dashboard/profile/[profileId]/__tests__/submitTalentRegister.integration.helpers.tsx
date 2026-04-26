import "./submitTalentRegister.integration.mocks";

import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type FieldErrors, type UseFormReturn } from "react-hook-form";

import {
  talentRegisterSchema,
  type TalentRegisterFormValues,
} from "@/schemas/talent/talentRegisterSchema";
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
  onSubmit?: (params: TempSaveHandlerParams) => Promise<unknown> | unknown;
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
  onSubmit,
  profileId = 1,
}: HarnessProps) {
  const router = useRouter();
  const methods = useForm<TalentRegisterFormValues>({
    defaultValues: initialValues ?? cloneDefaultValues(),
    resolver: zodResolver(talentRegisterSchema),
    mode: "onSubmit",
    shouldFocusError: true,
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
        methods.reset(result.data, { keepTouched: true, keepErrors: true });
      }
      showToast("임시 저장되었습니다!");
    }

    return result;
  };

  const handleSubmit = async (values: TalentRegisterFormValues) => {
    const result = onSubmit
      ? await onSubmit({ values, methods, profileId })
      : await submitTalentRegister({
          values,
          methods,
          profileId,
        });

    if (isTempSaveResult(result) && result.success) {
      if (result.data) {
        methods.reset(result.data);
      }
      showToast("인재 프로필이 성공적으로 등록되었습니다!");
      router.push("/profile");
    }

    return result;
  };

  const handleError = (errors: FieldErrors<TalentRegisterFormValues>) => {
    const getFirstErrorMessage = (value: unknown): string | undefined => {
      if (Array.isArray(value)) {
        for (const item of value) {
          const message = getFirstErrorMessage(item);
          if (message) {
            return message;
          }
        }
        return undefined;
      }

      if (typeof value !== "object" || value === null) {
        return undefined;
      }

      if ("message" in value && typeof value.message === "string") {
        return value.message;
      }

      for (const nestedValue of Object.values(value)) {
        const message = getFirstErrorMessage(nestedValue);
        if (message) {
          return message;
        }
      }

      return undefined;
    };

    const firstMessage = getFirstErrorMessage(errors);

    if (firstMessage) {
      showToast(firstMessage, "error");
    }
  };

  return (
    <FormProvider {...methods}>
      <TalentRegisterNav
        formId={formId}
        isSubmitDisabled={isSubmitDisabled}
        onTempSave={handleTempSave}
      />
      <form id={formId} onSubmit={methods.handleSubmit(handleSubmit, handleError)}>
        {children}
      </form>
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
  {
    children,
    initialValues,
    isSubmitDisabled,
    onTempSave,
    onSubmit,
    profileId,
  }: RenderHarnessOptions = {},
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
        onSubmit={onSubmit}
        profileId={profileId}
      >
        {children}
      </SubmitTalentRegisterIntegrationHarness>
    ),
  };
}
