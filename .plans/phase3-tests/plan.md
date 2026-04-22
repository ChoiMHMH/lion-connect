# Phase 3 — 핵심 로직 테스트 2개 + GitHub Actions CI

## 무엇을 / 왜

**무엇을**

- Vitest 기반 테스트 인프라 세팅 (vitest, jsdom, testing-library, setup 파일, npm scripts)
- `lib/apiClient.ts` 의 토큰 리프레시 동시성 동작을 단위 테스트로 증명
- `app/dashboard/profile/[profileId]/_actions/submitTalentRegister.ts` 의 POST/PUT 분기 동작을 단위 테스트로 증명
- GitHub Actions 워크플로우 추가 → PR 마다 type-check + test 자동 실행

**왜**

- 현재 `package.json` 에 `test` 스크립트 자체가 없고 테스트 0개. 이후 리팩토링에서 회귀를 잡을 안전망이 없음.
- 두 타깃은 서버 없이 `fetch` / 도메인 API 를 모킹해 내부 로직만 검증 가능한 영역. 공용 로직이라 회귀가 나면 광범위하게 영향.
- CI 에서 type-check + test 를 함께 돌려 기본 품질 게이트를 자동화. lint 는 기존 warning 정리 후 별도 PR 에서 CI 에 추가.

## 현재 상태 진단

- `package.json` scripts: `dev / build / start / lint / lint:fix / format / format:check / type-check / prepare` — `test` 없음
- 테스트 러너 (vitest / jest) 미설치
- `test/` 디렉토리 없음
- `.github/workflows/` 없음
- `lib/apiClient.ts` 관찰 사실
  - `refreshPromise` 모듈 스코프 변수로 중복 refresh 방지
  - refresh 토큰 추출은 **Authorization 헤더 1순위 → `response.json().accessToken` 2순위**
  - refresh 실패 시 `useAuthStore.getState().clearAuth()` 호출 + `ApiError("REFRESH_FAILED")` throw
  - `_isRetry: true` 플래그로 무한 루프 방지
  - `skipAuth: true` 일 때 Authorization 헤더 미추가 + 401 자동 재시도 스킵
  - 204 / 빈 본문 / 비-JSON 응답은 빈 객체 반환 (원 요청과 재시도 경로 모두)
- `submitTalentRegister.ts` 는 14섹션 폼을 dirtyFields 기반으로 분기 제출 (상세 동작은 task 단계에서 읽어 확정)
- 하네스 (husky pre-commit / commit-msg, 이슈·PR 템플릿) 정상 동작 — 본 Phase 도 이슈 → draft PR → task 커밋 순서로 진행

## 해결책

1. **Vitest 세팅** — `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` 설치. `vitest.config.ts` (jsdom / globals / setupFiles / coverage v8 / alias `@`), `test/setup.ts` (jest-dom + afterEach cleanup), `package.json` 에 `test`, `test:watch`, `test:ui`, `test:coverage` 추가.
2. **apiClient 테스트** — `lib/__tests__/apiClient.test.ts`. `vi.spyOn(global, 'fetch')` 로 401 → refresh → 재시도 시퀀스 주입. `useAuthStore.setState` 로 초기 토큰 주입, `afterEach` 에서 리셋. `refreshPromise` 모듈 스코프 격리를 위해 필요 시 `vi.resetModules()` + dynamic import 사용.
3. **submitTalentRegister 테스트** — `app/dashboard/profile/[profileId]/_actions/__tests__/submitTalentRegister.test.ts`. 도메인 API 함수를 `vi.mock` 으로 가짜화, RHF `UseFormReturn` 은 `renderHook(() => useForm(...))` 로 실제 인스턴스 사용. 이미지 업로드 파이프라인 (presign → S3 → complete → link) 호출 순서 검증.
4. **GitHub Actions CI** — `.github/workflows/test.yml`. `push` / `pull_request` on `main` 트리거, `npm ci` → `npm run type-check` → `npm run test:coverage` → coverage artifact 업로드. husky 자동 실행을 막기 위해 job env 에 `HUSKY=0`. `npm run lint` 는 기존 warning 70개가 `--max-warnings=0` 에 걸리므로 본 PR 에서는 제외하고, 별도 이슈에서 warning 을 0으로 줄인 뒤 CI 에 추가.
5. **하네스 워크플로우 준수** — plan 승인 후 task.md 작성 → 이슈 생성 → `test/<issue-num>-phase3-tests` 브랜치 → 첫 커밋 후 draft PR → task 단위 커밋 → CI 녹색 후 `gh pr ready`.

## 트레이드오프

| 선택 | 장점 | 단점 |
|---|---|---|
| 테스트 2개 타깃만 | 집중·속도. 한 PR 에 모을 수 있음 | 커버리지 숫자 낮게 나옴 |
| `vi.mock` + fetch 스파이 | 설정 단순·빠름·서버 불필요 | 실제 HTTP 계층은 미커버. MSW 도입은 후속 과제 |
| Vitest (Jest 아님) | Next 15 + ESM 친화, 설정 단순 | Jest 생태계 자료 많음 |
| CI 에 type-check + test 묶음 | 현재 PR 에서 깨끗한 green 확보 | lint 는 별도 이슈 완료 전까지 CI 게이트가 아님 |
| 하네스 task 단위 커밋 | 리뷰·롤백 쉬움 | 커밋·PR 교환 수 증가 |

## 대안

1. **Jest 사용** — Next 15 + ESM 설정 까다로움. 설정 비용 크고 이점 적음. 기각.
2. **Playwright E2E 우선** — 백엔드가 필요한데 현재 서버 가용성 확보 어려움. 기각.
3. **테스트 범위 10+ 개로 확대** — 기간 길어지고 이번 Phase 의 안전망 목적과 비례하지 않음. 기각.

## 완료 기준 (DoD)

- [ ] Vitest + jsdom + testing-library 설치 (devDependencies)
- [ ] `vitest.config.ts` 존재 (jsdom / globals / setupFiles / coverage v8 / alias `@`)
- [ ] `test/setup.ts` 존재 (jest-dom 확장 + afterEach cleanup)
- [ ] `package.json` scripts 에 `test`, `test:watch`, `test:ui`, `test:coverage` 추가
- [ ] `lib/__tests__/apiClient.test.ts` 통과 — 최소 케이스:
  - 동시 3요청 401 → refresh 1회 + 각 원요청 재시도 성공
  - refresh 토큰을 Authorization 헤더에서 뽑는 경로 / body 에서 뽑는 경로 각각
  - refresh 실패 → `clearAuth` 호출 + 에러 전파
  - `_isRetry: true` 는 재시도하지 않음
  - `skipAuth: true` 는 Authorization 헤더 없음 + 401 자동 재시도 없음
  - 타임아웃 시 `ApiError` code `TIMEOUT`
  - 204 응답 → 빈 객체 (원 요청 · 재시도 경로 모두)
- [ ] `app/dashboard/profile/[profileId]/_actions/__tests__/submitTalentRegister.test.ts` 통과 — 최소 케이스:
  - 학력 기존 변경 1 + 신규 1 → `updateEducation` 1회 / `createEducations` 1회
  - 전 섹션 dirty 없음 → 도메인 API 0회
  - 이미지 File 업로드 4단계 (presign → S3 → complete → link) 순차 호출
  - `isTempSave: true` → 최종 profile update `status === "DRAFT"`
  - `isTempSave: false` → `status === "COMPLETED"` + profile update 가 마지막
  - 하위 섹션 1개 실패 시 현재 동작 (전체 실패) 를 명시적으로 기록
- [ ] `.github/workflows/test.yml` 존재, main push/PR 에서 green 1회 확인
- [ ] CI job env 에 `HUSKY=0`
- [ ] 이슈 / draft PR / task 단위 커밋 / `gh pr ready` 까지 하네스 프로토콜 준수

## 다음 단계

plan.md 승인 후 `.plans/phase3-tests/task.md` 작성 — task 단위 (= 커밋 단위) 로 쪼개고 각 task 의 실패 테스트 먼저 명시. 승인 후 이슈 생성 → 브랜치 → draft PR 순서로 진행.
