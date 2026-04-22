/**
 * submitTalentRegister 테스트 공용 헬퍼 (T5)
 *
 * - makeMethods: UseFormReturn 의 최소 필요 필드만 stub 으로 제공.
 *   (submitTalentRegister 가 실제로 읽는 것: formState.dirtyFields,
 *    formState.defaultValues, getValues)
 * - defaultFormValues / mergeValues: 베이스 폼 값 복제·병합 유틸.
 */

import type { UseFormReturn } from "react-hook-form";
import { defaultTalentRegisterValues } from "@/schemas/talent/talentRegisterSchema";
import type { TalentRegisterFormValues } from "@/schemas/talent/talentRegisterSchema";

type DirtyFieldsShape = Record<string, unknown>;

export interface MakeMethodsInput {
  values: TalentRegisterFormValues;
  defaultValues?: Partial<TalentRegisterFormValues>;
  dirtyFields?: DirtyFieldsShape;
}

/**
 * UseFormReturn 의 최소 stub.
 * 타입은 UseFormReturn 로 캐스팅하지만 실제로는 submitTalentRegister 가
 * 접근하는 멤버만 구현.
 */
export function makeMethods({
  values,
  defaultValues,
  dirtyFields = {},
}: MakeMethodsInput): UseFormReturn<TalentRegisterFormValues> {
  const stub = {
    formState: {
      dirtyFields,
      defaultValues: defaultValues ?? defaultTalentRegisterValues,
    },
    getValues: (path?: string) => {
      if (!path) return values;
      // "skills.main" 같은 점 경로만 지원 (submit 액션이 이것만 사용)
      return path
        .split(".")
        .reduce<unknown>(
          (acc, key) =>
            acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
          values
        );
    },
  };
  return stub as unknown as UseFormReturn<TalentRegisterFormValues>;
}

/**
 * 베이스 폼 값을 깊은 복제해서 반환. 테스트에서 수정해도 원본이 오염되지 않음.
 */
export function cloneDefaultValues(): TalentRegisterFormValues {
  return JSON.parse(JSON.stringify(defaultTalentRegisterValues)) as TalentRegisterFormValues;
}
