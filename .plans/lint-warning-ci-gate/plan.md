# Lint Warning 정리 및 CI Lint Gate 추가

## 무엇을 / 왜

이슈 #5의 범위로 기존 ESLint warning을 0개로 줄이고, `npm run lint`를 GitHub Actions test workflow에 품질 게이트로 추가한다.

현재 `npm run lint`는 `eslint . --max-warnings=0` 설정 때문에 warning이 하나라도 있으면 실패한다. Phase 3 테스트/CI PR에서는 기존 warning 때문에 lint step을 제외했으므로, 이번 작업에서 warning을 정리해 CI가 type-check, lint, test:coverage를 모두 검증하도록 만든다.

## 현재 상태 진단

- 브랜치: `chore/5-lint-warning-ci-gate`
- 기준: `main` 최신 (`origin/main` PR #4 merge 반영)
- `npm run lint` 결과: `71 problems (0 errors, 71 warnings)`
- warning 유형:
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unused-vars`
  - `react-hooks/exhaustive-deps`
  - 생성물 `coverage/`가 ESLint 대상에 포함되어 발생한 warning
- `.github/workflows/test.yml` 현재 단계:
  - `npm ci`
  - `npm run type-check`
  - `npm run test:coverage`
  - coverage artifact 업로드

## 해결책

- ESLint ignore 범위를 정리해 `coverage/**` 같은 생성물이 lint 대상에 포함되지 않게 한다.
- 사용하지 않는 import, 변수, 인자는 제거하거나 실제 사용 의도가 남아 있으면 `_` prefix 규칙에 맞춰 조정한다.
- `any`는 주변 타입, DTO, `unknown`, `Record<string, unknown>` 등으로 교체하고, 타입 단언이 필요한 곳은 최소 범위로 제한한다.
- `react-hooks/exhaustive-deps` warning은 의존성 배열 보정, memoization, hook 구조 단순화 중 기존 동작을 보존하는 방식으로 해결한다.
- `npm run lint` 통과 후 `.github/workflows/test.yml`에 `npm run lint` step을 추가한다.

## 트레이드오프

- 모든 warning을 코드 수정으로 없애면 lint gate의 신뢰도는 높아지지만, `any` 제거와 hook deps 보정은 기존 동작을 건드릴 수 있어 테스트와 type-check 확인이 필요하다.
- 일부 unused 값을 `_` prefix로 남기면 변경량은 줄지만, 실제로 죽은 코드인지 아직 필요한 확장 지점인지 판단이 흐려질 수 있다.
- `coverage/**`를 ESLint ignore에 추가하면 로컬에서 테스트 실행 후에도 lint가 안정적이지만, ignore 범위를 넓히는 변경이므로 생성물에만 한정해야 한다.

## 대안

- ESLint rule을 완화하거나 `--max-warnings` 기준을 올린다.
  - 기각 이유: 이슈의 목표가 warning 0개와 CI lint gate 추가라서 품질 기준을 낮추는 방향이다.
- `.github/workflows/test.yml`에 lint step만 추가하고 warning 정리를 나중으로 미룬다.
  - 기각 이유: 현재 lint가 실패하므로 CI가 즉시 red가 된다.
- 파일 단위 `eslint-disable`을 추가한다.
  - 기각 이유: warning 원인을 해결하지 않고 debt를 숨기는 방식이며, 이번 이슈의 DoD와 맞지 않는다.

## 완료 기준

- [ ] `npm run lint` 통과
- [ ] `npm run type-check` 통과
- [ ] `npm run test:coverage` 통과
- [ ] `.github/workflows/test.yml`에 `npm run lint` step 추가
- [ ] PR에서 type-check + lint + test:coverage CI green 확인
