import { createElement } from "react";
import { vi } from "vitest";

import "../_actions/__tests__/submitTalentRegister.mocks";

export const routerPushMock = vi.fn();
export const showToastMock = vi.fn();
export const hideToastMock = vi.fn();

type ToastType = "success" | "error" | "info";

interface ToastStoreState {
  isVisible: boolean;
  message: string;
  type: ToastType;
  showToast: typeof showToastMock;
  hideToast: typeof hideToastMock;
}

export const useToastStoreMock = vi.fn((selector?: (state: ToastStoreState) => unknown) => {
  const state: ToastStoreState = {
    isVisible: false,
    message: "",
    type: "success",
    showToast: showToastMock,
    hideToast: hideToastMock,
  };

  return selector ? selector(state) : state;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}));

vi.mock("@/store/toastStore", () => ({
  useToastStore: useToastStoreMock,
}));

export function resetIntegrationMocks() {
  routerPushMock.mockReset();
  showToastMock.mockReset();
  hideToastMock.mockReset();
  useToastStoreMock.mockClear();
}
