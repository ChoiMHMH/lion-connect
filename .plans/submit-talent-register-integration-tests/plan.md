# submitTalentRegister UI integration 테스트

## 무엇을 / 왜

**무엇을**

- `submitTalentRegister` 단위 테스트로 고정되지 않는 UI 상호작용 구간을 `@testing-library/react` 기반 integration 테스트로 검증한다.
- 특히 `TalentRegisterNav`의 임시저장 debounce, `page.tsx`의 `methods.reset(...)`, `useFieldArray` 기반 섹션 추가/삭제 후 재저장 흐름을 테스트 대상으로 삼는다.
- 백엔드가 내려가 있어 E2E를 돌릴 수 없는 동안, jsdom + API mock 환경에서 프론트에서 재현 가능한 회귀를 최대한 먼저 고정한다.

**왜**

- 현재 `_actions/__tests__`의 단위 테스트는 payload 조립과 POST/PUT/skip 분기는 잘 커버하지만, 실제 화면에서 버튼 클릭 → 입력 → reset → 다음 저장까지 이어지는 상태 전이는 직접 검증하지 못한다.
- `submitTalentRegister.ts`는 일부 섹션을 `defaultValues` 비교, 일부 섹션을 `dirtyFields`로 판단한다. 이 차이는 `methods.reset(...)`와 결합될 때 실제 UI에서만 드러나는 버그를 만들 수 있다.
- 사용자 제보 이슈도 “추가/삭제/임시저장 연타 후 중복 POST”처럼 React Hook Form과 컴포넌트 상호작용 레이어에 가까워, unit test만으로는 회귀 방지가 부족하다.
- 현재 백엔드가 죽어 있어 Playwright/E2E로 올바른 서버 상태까지 확인할 수 없으므로, 지금 할 수 있는 최선은 integration 테스트로 프론트 흐름을 먼저 고정하는 것이다.

## 현재 상태 진단

- 현재 브랜치: `test/7-submit-talent-register-remaining-tests`
- 기존 테스트 범위:
  - `_actions/__tests__/submitTalentRegister.test.ts`: 공통 플로우
  - `_actions/__tests__/submitTalentRegister.arraySections.test.ts`: 학력/경력/활동/언어/자격증 배열 섹션
  - `_actions/__tests__/submitTalentRegister.choiceSections.test.ts`: 링크/jobs/expTags/customSkills/workDriven
- 현재 빠진 검증 층:
  - `TalentRegisterNav`의 1초 debounce 이후 실제 `onTempSave`가 한 번만 호출되는지
  - `page.tsx`에서 임시저장 성공 후 `methods.reset(result.data, { keepDirty: true ... })`가 다음 저장 판단에 어떤 영향을 주는지
  - `EducationSection`, `CareerSection` 등 `useFieldArray` 섹션에서 추가/삭제 후 `reset(currentValues, ...)`가 defaultValues를 의도대로 갱신하는지
  - 실제 화면 이벤트 기준으로 “첫 저장은 POST, 두 번째 저장은 PUT/skip”이 유지되는지
  - 성공/실패 토스트가 중복 호출되거나 예상과 다르게 노출되는지
- 테스트 인프라는 이미 준비되어 있다.
  - `vitest.config.ts`에서 `jsdom` 환경과 `test/setup.ts`가 설정되어 있다.
  - `@testing-library/react`, `@testing-library/user-event`, `jsdom` 의존성이 이미 설치되어 있다.
- 제약:
  - 백엔드가 내려가 있어 실제 서버 상태, DB 반영 수, 브라우저 네트워크 탭 기준 E2E 검증은 당장 불가능하다.
  - 따라서 이번 단계의 계약은 “UI 상호작용이 올바른 API 호출 수와 인자를 만든다”까지다.

## 해결책

- 페이지 전체를 바로 E2E처럼 렌더링하지 않고, 먼저 `FormProvider + TalentRegisterNav + 대상 섹션 + submit handler`를 묶은 최소 harness integration 테스트를 만든다.
- 첫 테스트 범위는 실제 버그 가능성이 높은 흐름부터 시작한다: 임시저장 debounce, 배열 섹션 추가 후 저장, 저장 응답으로 reset 후 재저장, 삭제 후 재저장.
- 네트워크는 실제 백엔드 대신 기존 API mock을 재사용하거나 컴포넌트 테스트 전용 mock으로 분리해, 호출 횟수와 payload만 검증한다.
- `page.tsx` 전체 렌더링이 너무 무거우면 `handleTempSave`와 동일 계약을 가진 테스트용 wrapper를 만들어 RHF 상태 전이만 고정한다.
- integration 테스트에서 드러난 실제 버그만 최소 수정한다. 구조 리팩토링은 이번 계획 범위에서 제외한다.

## 트레이드오프

| 선택 | 장점 | 단점 |
|---|---|---|
| Testing Library integration 테스트 | 백엔드 없이도 UI 흐름과 RHF 상태 전이를 검증 가능 | 세팅과 mock이 unit test보다 무겁다 |
| 최소 harness 방식 | 테스트 실패 원인이 비교적 선명하고 유지비가 낮다 | 실제 페이지 전체 컨텍스트 일부는 생략된다 |
| 페이지 전체 대신 섹션/내비 중심 검증 | 핵심 버그를 빠르게 고정 가능 | router, query hook, store 연동 회귀는 일부 남는다 |
| E2E를 뒤로 미루고 integration 먼저 작성 | 현재 제약 아래에서 바로 진행 가능 | 실제 서버 상태와 브라우저 네트워크 결과까지는 보장하지 못한다 |
| 발견 버그를 같은 PR에서 최소 수정 | 테스트와 수정 근거가 한곳에 남는다 | 순수 테스트 PR보다 리뷰 범위가 넓어진다 |

## 대안

1. **백엔드가 살아날 때까지 E2E만 기다린다**
   - 기각 이유: 지금 재현 가능한 프론트 회귀를 방치하게 되고, 반복 저장/삭제 같은 UI 상태 버그는 지금도 충분히 잡을 수 있다.
2. **기존 unit test를 더 늘린다**
   - 기각 이유: payload 분기는 이미 상당 부분 고정되었다. 지금 부족한 건 이벤트 기반 상태 전이라 같은 층 테스트를 늘려도 공백이 남는다.
3. **Playwright에서 API route mock으로 E2E 흉내를 낸다**
   - 기각 이유: 장기적으로는 가능하지만, 현재 레포에는 그 인프라가 없고 이번 목적은 브라우저 자동화보다 RHF 흐름 검증이 우선이다.
4. **페이지 전체를 통째로 렌더링하는 거대한 integration 테스트 하나만 작성한다**
   - 기각 이유: router, store, query hook mock 비용이 크고 실패 원인 파악이 어려워 유지보수성이 낮다.

## 완료 기준

- [ ] integration 테스트 파일이 새로 추가된다
  - 위치는 `app/dashboard/profile/[profileId]/__tests__` 또는 이에 준하는 UI 테스트 전용 경로
- [ ] 임시저장 debounce 테스트 통과
  - 짧은 시간 연속 클릭 시 저장 핸들러가 1회만 실행됨
- [ ] 배열 섹션 추가 후 저장 테스트 통과
  - 사용자가 항목을 추가하고 값을 입력한 뒤 임시저장하면 관련 POST API가 1회만 호출됨
- [ ] reset 후 재저장 테스트 통과
  - 첫 저장 응답으로 id가 주어진 뒤 다시 임시저장하면 같은 항목에 대해 중복 POST가 발생하지 않음
- [ ] 배열 섹션 삭제 후 재저장 테스트 통과
  - 삭제 후 `reset(currentValues, ...)`가 반영되어 삭제된 항목이 다음 저장 판단에 잘못 남지 않음
- [ ] jobs / expTags처럼 dirtyFields 기반 분기 중 최소 1개는 integration 관점에서도 재검증한다
  - 반복 저장 시 호출 조건이 의도와 맞는지 명시적으로 고정
- [ ] 성공/실패 토스트 노출이 기대와 다르면 테스트로 고정하고, 실제 버그면 최소 수정으로 해결한다
- [ ] `npm test -- <integration-test-pattern>` 통과
- [ ] 관련 기존 `submitTalentRegister` unit test가 계속 통과한다
- [ ] `npm run type-check` 통과
- [ ] 이번 작업은 E2E 대체가 아니라 프론트 integration 보강이라는 점이 plan/task에 명시된다

## 다음 단계

사용자가 이 계획에 "진행"이라고 승인하면 `.plans/submit-talent-register-integration-tests/task.md`를 작성한다. task.md에서는 테스트 대상을 `Nav debounce → 배열 섹션 reset → dirtyFields/토스트 보강 → 전체 검증` 순서로 커밋 단위로 분할한다.
