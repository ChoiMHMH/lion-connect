# submitTalentRegister UI integration 테스트 — Task 분할

> plan: [plan.md](./plan.md)
> 이슈: `TBD` `test: submitTalentRegister UI integration 테스트`
> 대상 브랜치: `TBD` `test/<issue-num>-submit-talent-register-integration-tests`
> 원칙: task 1개 = 커밋 1개. 각 task는 실패 테스트 작성 → red 확인 → 최소 수정 → green 확인 순서로 진행한다.
> 참고: 이 문서는 task 분할 문서다. 실제 구현 착수 전에는 `.agents/workflow.md`에 따라 새 issue/branch를 만들고, 첫 커밋 push 이후 draft PR을 생성한다.

## 본 PR 의 스코프

- **포함**: `@testing-library/react` 기반 integration 테스트 하네스, `TalentRegisterNav` debounce/validation, 배열 섹션 추가·저장·reset·삭제 흐름, 최소 1개의 dirtyFields 기반 저장 흐름, 토스트 노출 검증, 테스트 중 발견되는 실제 버그의 최소 수정
- **제외**: Playwright/E2E, 백엔드·DB 검증, `page.tsx` 전체에 대한 무거운 end-to-end 수준 렌더링, submit 로직 구조 리팩토링, API 계약 변경
- **기본 테스트 위치 후보**: `app/dashboard/profile/[profileId]/__tests__/submitTalentRegister.integration.test.tsx`
- **기본 헬퍼 위치 후보**: `app/dashboard/profile/[profileId]/__tests__/submitTalentRegister.integration.helpers.tsx`
- **mock 위치 후보**: `app/dashboard/profile/[profileId]/__tests__/submitTalentRegister.integration.mocks.ts`

## 설계 원칙

- 현재 목적은 “브라우저 전체”가 아니라 “RHF 상태 전이 + 사용자 상호작용” 검증이다.
- 따라서 페이지 전체를 바로 렌더링하지 않고, 먼저 `FormProvider + TalentRegisterNav + 대상 섹션 + page.tsx 와 같은 temp-save wrapper`를 묶은 최소 하네스를 만든다.
- API 는 실제 백엔드 대신 mock 으로 고정하고, 이번 단계의 검증 계약은 “어떤 UI 흐름에서 어떤 API 호출이 몇 번 나가는가”까지로 제한한다.
- 실제 버그가 드러나면 테스트를 먼저 고정하고, 수정 범위는 `TalentRegisterNav`, 해당 섹션 컴포넌트, `submitTalentRegister`, 또는 테스트 하네스에 필요한 최소 범위로 제한한다.

## 의존성 순서

```text
T1 integration 하네스/공용 mock
  └─► T2 Nav debounce + 임시저장 validation
        └─► T3 학력 섹션 첫 저장 + reset 후 재저장
              └─► T4 배열 섹션 삭제 + 재저장
                    └─► T5 dirtyFields 기반 저장 흐름 재검증
                          └─► T6 토스트/실패 처리
                                └─► T7 전체 검증·PR 정리
```

T3~T4는 같은 하네스를 공유한다. 우선 실제 제보 맥락과 가장 가까운 `EducationSection`을 기준으로 고정한 뒤, 필요하면 다른 배열 섹션으로 확장한다.

---

## T1 — integration 하네스·공용 mock 스캐폴드

**보장할 동작**: UI integration 테스트를 위한 최소 하네스가 준비되고, 이후 task 가 같은 wrapper/mocks 를 재사용할 수 있다.

**먼저 쓸 실패 테스트**

- 새 테스트 파일이 Vitest 에서 탐지되고 jsdom 환경에서 렌더링된다.
- 최소 하네스 렌더 시 `TalentRegisterNav` 와 대상 섹션이 정상 마운트된다.
- 공용 mock 로딩 후 외부 네트워크 없이 테스트가 실행된다.

**구현 방침**

- `renderSubmitTalentRegisterHarness(...)` 같은 helper 를 만든다.
- 하네스는 아래 계약을 가진다.
  - `FormProvider` 로 RHF 제공
  - `TalentRegisterNav` 렌더
  - 섹션 컴포넌트 하나 또는 복수 렌더
  - `page.tsx` 의 `handleTempSave` 와 같은 wrapper 사용
  - 저장 성공 시 `methods.reset(result.data, { keepDirty: true, keepTouched: true, keepErrors: true })`
- `next/navigation`, `useToastStore`, 필요한 API 모듈은 integration 테스트 전용 mock 으로 분리한다.
- 가능하면 기존 `_actions/__tests__/submitTalentRegister.mocks.ts` 와 중복을 줄이되, 컴포넌트용 mock 은 UI 테스트 경로에 독립적으로 둔다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: integration 테스트 골격이 green 이고, 다음 task 에서 helper/mocks 를 그대로 재사용할 수 있다.

**커밋**: `test: submitTalentRegister integration 하네스 스캐폴드`

---

## T2 — Nav debounce + 임시저장 validation

**보장할 동작**: `TalentRegisterNav` 의 임시저장 버튼은 짧은 시간 연속 클릭 시 저장을 1회만 실행하고, temp-save validation 실패 시 저장을 막는다.

**먼저 쓸 실패 테스트**

- 임시저장 버튼 2~3회 연속 클릭 + 1초 이전 → 저장 핸들러 호출 0회
- 같은 흐름에서 1초 경과 → 저장 핸들러 호출 1회
- validation 실패 값 상태에서 임시저장 → 저장 핸들러 호출 0회 + 에러 토스트 1회
- debounce 대기 중 다시 클릭하면 이전 타이머가 취소되고 마지막 클릭 기준으로 1회만 실행

**구현 방침**

- `vi.useFakeTimers()` 를 사용해 debounce 를 결정적으로 검증한다.
- 이 task 는 우선 `TalentRegisterNav` 중심 테스트로 시작한다. 아직 `submitTalentRegister` 전체 흐름과 묶지 않아도 된다.
- selector 는 role/name 기반을 우선 사용하고, 필요하면 title input 과 임시저장 버튼에 대한 접근성 질의를 보강한다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: debounce/validation 테스트가 green 이고, 클릭 연타 시 중복 저장 실행이 방지된다.

**커밋**: `test: TalentRegisterNav 임시저장 debounce 와 validation 검증`

---

## T3 — 학력 섹션 첫 저장 + reset 후 재저장

**보장할 동작**: 사용자가 학력을 추가하고 임시저장하면 첫 저장은 POST 되고, 응답으로 받은 id 로 reset 된 뒤 다시 임시저장해도 중복 POST 가 발생하지 않는다.

**먼저 쓸 실패 테스트**

- 학력 1개 추가 + 필수값 입력 + 임시저장 → `createEducations` 1회
- `createEducations` 응답에 id 를 반환하면 하네스 wrapper 가 `methods.reset(...)` 를 수행
- 같은 데이터로 다시 임시저장 → `createEducations` 호출 횟수 추가 없음
- 두 번째 저장 시 필요하면 `updateEducation` 또는 skip 이고, “같은 신규 항목이 다시 POST” 되는 일은 없음

**구현 방침**

- 실제 `EducationSection` 을 렌더링하고, `userEvent` 로 “학력 추가”, 입력, 임시저장 클릭 흐름을 그대로 밟는다.
- 저장 결과 반영은 하네스 내부의 temp-save wrapper 가 담당한다. `page.tsx` 의 reset 옵션을 그대로 맞춘다.
- 이 task 의 핵심 assert 는 “첫 저장 후 서버 id 가 기본값으로 반영되어 다음 저장 판단이 바뀌는가”다.

**검증**

- `npm test -- submitTalentRegister.integration`
- 필요 시 `npm test -- submitTalentRegister`

**완료 기준**: 학력 중복 POST 회귀가 integration 테스트로 고정된다.

**커밋**: `test: 학력 임시저장 reset 후 중복 POST 방지 검증`

---

## T4 — 배열 섹션 삭제 + 재저장 흐름

**보장할 동작**: 배열 섹션에서 항목 삭제 후 `reset(currentValues, ...)` 가 defaultValues 를 갱신해, 다음 저장 판단에 삭제된 항목이 잘못 남지 않는다.

**먼저 쓸 실패 테스트**

- 기존 id 가 있는 학력 또는 경력 1개를 렌더링
- 삭제 버튼 클릭 → 필요 시 delete API 호출 1회 + 화면에서 항목 제거
- 삭제 직후 섹션 컴포넌트의 `reset(currentValues, ...)` 반영
- 이후 임시저장 → 삭제된 항목에 대한 create/update 가 잘못 다시 호출되지 않음
- delete API 실패 시 항목이 제거되지 않고 에러 메시지가 노출됨

**구현 방침**

- 우선 `EducationSection` 으로 시작하고, 삭제 UI selector 가 더 안정적인 섹션을 선택한다.
- 삭제 테스트는 섹션 컴포넌트 자체의 `remove + reset` 동작과 temp-save wrapper 이후 흐름을 같이 본다.
- 실제 버그가 학력보다 경력에서 재현되기 쉬우면 task 범위 안에서 `CareerSection` 으로 전환 가능하다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: 배열 삭제 후 재저장에서 잘못된 재생성/재저장이 발생하지 않는다는 계약이 고정된다.

**커밋**: `test: 배열 섹션 삭제 후 재저장 흐름 검증`

---

## T5 — dirtyFields 기반 저장 흐름 재검증

**보장할 동작**: dirtyFields 기반으로 저장하는 섹션도 실제 UI 입력 흐름에서 호출 조건이 의도대로 유지된다.

**먼저 쓸 실패 테스트**

- 최소 1개 대상을 고른다: `jobs` 또는 `expTags`
- 값 변경 없이 반복 임시저장 → 불필요한 PUT 이 반복되지 않음 또는 현재 의도된 동작을 명시적으로 고정
- 관련 입력 변경 후 임시저장 → 해당 PUT 1회
- reset 이후 다시 동일 값으로 임시저장 → 추가 PUT 여부를 계약으로 고정

**구현 방침**

- `JobSection` 전체가 무거우면, RHF 에 실제로 `register("job.role")`, `register("job.category")`, `register("job.experiences")` 를 연결한 최소 입력 하네스를 먼저 쓴다.
- 이 task 의 목적은 섹션 UI 자체보다 `dirtyFields` 와 temp-save/reset 결합 결과를 보는 것이다.
- 현재 동작이 합리적이지 않으면 실패 테스트를 먼저 남기고 최소 수정으로 바로잡는다.

**검증**

- `npm test -- submitTalentRegister.integration`
- 필요 시 `npm test -- submitTalentRegister`

**완료 기준**: dirtyFields 기반 분기 중 최소 1개가 integration 층에서도 회귀 방지된다.

**커밋**: `test: dirtyFields 기반 저장 흐름 integration 검증`

---

## T6 — 토스트·실패 처리 검증

**보장할 동작**: 성공/실패 토스트가 기대 횟수로만 노출되고, 저장 실패 시 성공 UI 가 함께 뜨지 않는다.

**먼저 쓸 실패 테스트**

- 임시저장 성공 시 성공 토스트 1회만 노출
- 저장 실패 시 에러 토스트 1회만 노출하고 성공 토스트는 노출되지 않음
- validation 실패 토스트와 저장 실패 토스트가 섞이지 않음
- 실제로 중복 토스트가 뜬다면 이를 버그로 고정하고 최소 수정

**구현 방침**

- `useToastStore` mock 호출 횟수와 인자를 기준으로 검증한다.
- 이 task 는 T2/T3 하네스를 재사용해 “Nav + page wrapper” 전체 조합에서 토스트가 몇 번 뜨는지 확인한다.
- 성공 토스트 중복이 현재 구조상 의도치 않은 동작이면, 어느 레이어가 책임을 가져야 하는지 정하고 한 곳으로 정리한다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: 토스트 노출 계약이 테스트로 고정되고, 실패 시 사용자 피드백이 일관된다.

**커밋**: `test: 임시저장 토스트 와 실패 처리 검증`

---

## T7 — 전체 검증·PR 정리

**보장할 동작**: 이번 integration 테스트 PR 의 로컬 검증이 통과하고, 후속 workflow 문서 기준으로 PR 준비가 가능하다.

**먼저 쓸 테스트 / 검증**

- `npm test -- submitTalentRegister.integration`
- `npm test -- submitTalentRegister`
- `npm run type-check`
- 필요 시 `npm run test:coverage`

**작업**

- 실패한 검증이 있으면 원인 task 로 돌아가 수정하고 해당 task 커밋에 포함한다.
- 구현 시작 전에 workflow 단계가 아직 안 되어 있었다면 이 시점 이전에 반드시 아래를 수행한다.
  - issue 생성
  - 새 브랜치 생성
  - 첫 커밋 push 후 draft PR 생성
- PR 본문에는 integration 테스트 task 체크리스트, 테스트 명령, 리스크/롤백을 기록한다.
- 모든 task 완료 + CI green 후 `gh pr ready`.

**완료 기준**: integration 테스트와 관련 unit test/type-check 가 green 이고, PR 이 ready 전환 가능한 상태다.

**커밋**: 별도 코드 변경이 없다면 커밋 없음. 문서/PR 본문만 필요하면 `docs: submitTalentRegister integration 테스트 작업 상태 정리`

---

## 하네스 체크리스트

- [x] plan 승인
- [ ] task 승인
- [ ] workflow 단계 수행: issue 생성
- [ ] workflow 단계 수행: 새 브랜치 생성
- [ ] T1 완료 후 첫 커밋 push
- [ ] draft PR 생성
- [ ] task 완료마다 PR 본문 체크박스 업데이트
- [ ] integration 테스트 green
- [ ] 관련 unit test green
- [ ] type-check green
- [ ] CI green
- [ ] `gh pr ready`

## 승인 후 첫 작업

사용자가 이 task 분할에 "좋아"라고 승인하면, 구현에 들어가기 전에 `.agents/workflow.md`에 따라 새 issue/branch 를 만들고 T1부터 착수한다. T1의 첫 동작은 integration 테스트 파일과 하네스 helper 를 추가하고 `npm test -- submitTalentRegister.integration` 로 red 를 확인하는 것이다.
