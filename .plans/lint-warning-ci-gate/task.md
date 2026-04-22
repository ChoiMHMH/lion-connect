# Lint Warning 정리 및 CI Lint Gate 추가 — Task 분할

## 작업 기준

- 이슈: #5 `chore: lint warning 정리 및 CI lint 게이트 추가`
- 브랜치: `chore/5-lint-warning-ci-gate`
- 기준 브랜치: `main` 최신 (`origin/main` PR #4 merge 반영)
- 현재 red: `npm run lint` → `71 problems (0 errors, 71 warnings)`
- 커밋 원칙: task 1개 = 커밋 1개

## Task 의존성

T1 생성물 lint 제외
→ T2 unused warning 정리
→ T3 `any` warning 정리
→ T4 hooks deps warning 정리
→ T5 CI lint gate 추가 및 전체 검증

## T1 — 생성물 lint 제외

**보장할 동작**: 테스트 커버리지 생성물인 `coverage/**`가 `eslint .` 대상에 포함되지 않는다.

**먼저 쓸 테스트 / red 확인**:

- `npm run lint`
- 현재 `coverage/block-navigation.js` warning이 포함되어 실패하는 상태를 확인한다.

**예상 변경**:

- `eslint.config.mjs`
  - `coverage/**` ignore 추가

**검증**:

- `npm run lint`
  - 아직 다른 warning 때문에 red일 수 있으나, `coverage/` warning은 사라져야 한다.

**완료 기준**: lint 대상에서 생성물이 제외되고, ignore 범위가 `coverage/**`로 한정된다.

**커밋**: `chore: coverage 생성물 lint 제외`

## T2 — unused import/variable/argument warning 정리

**보장할 동작**: 사용하지 않는 import, 변수, 인자, catch binding으로 인한 `@typescript-eslint/no-unused-vars` warning이 발생하지 않는다.

**먼저 쓸 테스트 / red 확인**:

- `npm run lint`
- `@typescript-eslint/no-unused-vars` warning 목록을 기준으로 실패 상태를 확인한다.

**예상 변경 범위**:

- 회사/관리자/대시보드 UI 컴포넌트의 unused import/props/state 정리
- unused `catch (error)`는 `catch` 또는 실제 로깅/처리로 조정
- 사용 의도가 남아 있는 인자만 `_` prefix 규칙 적용

**검증**:

- `npm run lint`
  - 아직 `any`, hook deps warning 때문에 red일 수 있으나 unused warning은 0이어야 한다.
- `npm run type-check`

**완료 기준**: `no-unused-vars` warning이 0개다.

**커밋**: `chore: 미사용 코드 lint warning 정리`

## T3 — `no-explicit-any` warning 정리

**보장할 동작**: 명시적 `any` 없이 기존 타입 체크와 런타임 동작을 유지한다.

**먼저 쓸 테스트 / red 확인**:

- `npm run lint`
- `@typescript-eslint/no-explicit-any` warning 목록을 기준으로 실패 상태를 확인한다.

**예상 변경 범위**:

- `submitTalentRegister`의 섹션 payload/response 타입 보강
- profile/job-board/form 관련 컴포넌트의 이벤트, field path, API response 타입 보강
- 공용 hook의 generic 타입 정리
- 타입을 좁힐 수 없는 외부 데이터는 `unknown` 또는 `Record<string, unknown>`을 사용하고, 필요한 지점에서만 좁힌다.

**검증**:

- `npm run lint`
  - 아직 hook deps warning 때문에 red일 수 있으나 `no-explicit-any` warning은 0이어야 한다.
- `npm run type-check`
- 기존 테스트 영향이 있는 파일을 건드린 경우 관련 `npm test -- <path-pattern>`

**완료 기준**: `no-explicit-any` warning이 0개이고 `type-check`가 통과한다.

**커밋**: `chore: 명시적 any lint warning 정리`

## T4 — React hooks dependency warning 정리

**보장할 동작**: hook dependency warning을 제거하면서 기존 effect/callback 동작을 유지한다.

**먼저 쓸 테스트 / red 확인**:

- `npm run lint`
- `react-hooks/exhaustive-deps` warning 목록을 기준으로 실패 상태를 확인한다.

**예상 변경 범위**:

- `SkillsSection.tsx`
- `useNavigation.ts`
- `useScrollToTop.ts`

**검증**:

- `npm run lint`
- `npm run type-check`
- hook 동작 변경 가능성이 있으면 관련 컴포넌트/훅 테스트를 추가하거나 기존 수동 검증 가능한 구조를 유지한다.

**완료 기준**: `react-hooks/exhaustive-deps` warning이 0개이고 lint 전체가 통과한다.

**커밋**: `chore: hook dependency lint warning 정리`

## T5 — CI lint gate 추가 및 전체 검증

**보장할 동작**: GitHub Actions test workflow가 type-check, lint, test:coverage를 모두 실행한다.

**먼저 쓸 테스트 / red 확인**:

- T1-T4 완료 전에는 `npm run lint`가 실패하므로 CI lint step을 추가하지 않는다.
- T1-T4 완료 후 `npm run lint` green을 확인한 뒤 workflow를 수정한다.

**예상 변경**:

- `.github/workflows/test.yml`
  - `npm run type-check` 이후 또는 이전에 `npm run lint` step 추가
  - 최종 순서: `npm ci` → `npm run type-check` → `npm run lint` → `npm run test:coverage`

**검증**:

- `npm run lint`
- `npm run type-check`
- `npm run test:coverage`
- PR 생성 후 GitHub Actions green 확인

**완료 기준**: 로컬 검증 3종이 통과하고, PR CI에서 type-check + lint + test:coverage가 green이다.

**커밋**: `chore: CI에 lint 게이트 추가`

## PR 체크리스트

- [ ] task 승인 후 T1 착수
- [ ] 첫 커밋 push 후 draft PR 생성 (`Closes #5`)
- [ ] task 완료마다 PR 본문 체크박스 업데이트
- [ ] 모든 task 완료 후 CI green 확인
- [ ] `gh pr ready`
