# Phase 3 — Task 분할 (task = 커밋 단위)

> 원칙: 각 task 는 1개 커밋. TDD 순서 (실패 테스트 → green → refactor).
> plan: [plan.md](./plan.md)
> 대상 브랜치: `test/<issue-num>-phase3-tests` (이슈 생성 후 확정)

## 본 PR 의 스코프 (명시)

- **포함**: Vitest 인프라 · apiClient 12 케이스 · submitTalentRegister 테스트 기반 + **학력 섹션 대표 분기** + 공통 플로우 (업로드 순차성 · `status` 분기 · 실패 처리) · GitHub Actions CI.
- **미포함 (후속 PR)**: submitTalentRegister 의 **경력 · 활동 · 언어 · 자격증 · 링크 · jobs · expTags · customSkills · workDriven** 섹션별 분기 · payload 테스트.
- 본 PR 은 **전체 `submitTalentRegister` 커버리지가 아니라 "대표 섹션(학력) + 공통 플로우" 커버리지**를 목표로 함. 나머지 섹션은 같은 패턴으로 확장 가능하도록 헬퍼와 모킹 스캐폴드(T5)를 재사용 가능한 형태로 둔다.

## 의존성 순서

```
T1 (Vitest 인프라) ─┬─► T2 (apiClient 기본 케이스)
                    │       └─► T3 (apiClient refresh 경로)
                    │               └─► T4 (apiClient 엣지 케이스)
                    └─► T5 (submit 헬퍼)
                            └─► T6 (submit 학력 분기)
                                    └─► T7 (submit 제출 순서·상태)
                                            └─► T8 (CI 워크플로우)
```

T1 없으면 아무 테스트도 못 돌림. T2/T5 는 T1 이후 병렬 가능하나 리뷰 편의상 직렬 진행.

---

## T1 — Vitest 인프라 세팅

**보장할 동작**: `npm test` 가 설치·설정된 vitest 로 정상 기동 (테스트 없어도 exit 0).

**선행 테스트**: 본 task 자체는 인프라라 "실패 테스트 → green" 사이클 대신 **설치 검증용 dummy 테스트 1개** 작성 → red (실행 불가) → 인프라 추가 → green → dummy 제거 후 다시 실행해 "No test files" 로 정상 종료 확인.

**작업**

- `npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react`
- `vitest.config.ts` 신규 (jsdom / globals / setupFiles `./test/setup.ts` / coverage v8 / alias `@` → repo root)
- `test/setup.ts` 신규 (jest-dom 확장 import, `afterEach(cleanup + vi.restoreAllMocks)`)
- `package.json` scripts 에 `test`, `test:watch`, `test:ui`, `test:coverage` 추가

**완료 기준**: `npm test` 가 exit 0 으로 종료. `npm run test:coverage` 가 coverage 디렉토리를 만든다.

**커밋**: `chore: vitest + testing-library 인프라 세팅`

---

## T2 — apiClient 기본 케이스 테스트

**보장할 동작**: `apiRequest` 가 정상 응답 / 204 / 비-JSON / 타임아웃 / `skipAuth` 에서 기대대로 동작.

**선행 테스트** (`lib/__tests__/apiClient.test.ts` 신규):

- `get` 이 200 JSON 을 그대로 반환
- 204 응답 → 빈 객체
- `content-length: 0` → 빈 객체
- 타임아웃 발생 → `ApiError` + code `TIMEOUT`
- `skipAuth: true` → Authorization 헤더 없음 (fetch 호출 인자로 검증)

**작업**

- `vi.spyOn(global, 'fetch')` 사용
- `useAuthStore` 초기화 helper (`beforeEach` 에서 토큰 세팅, `afterEach` 에서 clear)
- 타임아웃 테스트는 `vi.useFakeTimers()` + `AbortController` 흐름 재현

**완료 기준**: 위 5 케이스 green.

**커밋**: `test: apiClient 기본 요청·타임아웃·skipAuth 동작`

---

## T3 — apiClient refresh 경로 테스트

**보장할 동작**: 401 → refresh → 재시도 파이프라인. 동시 3요청 시 refresh 1회.

**선행 테스트**:

- 단일 401 → refresh (Authorization 헤더로 토큰) → 재시도 성공
- 단일 401 → refresh (body `accessToken` 으로 토큰, 헤더 없음) → 재시도 성공
- **동시 3요청이 모두 401 → refresh 1회만 호출 + 각 원요청 재시도 성공**
- 성공 시 `useAuthStore.accessToken` 이 새 토큰으로 업데이트됨

**작업**

- `refreshPromise` 모듈 스코프 격리 위해 각 테스트 시작 전 `vi.resetModules()` + dynamic import (또는 `vi.isolateModules`) — **기본 접근**
- 위 방식으로 테스트가 과하게 복잡해지거나 불안정하면 `apiClient.ts` 에 `__resetForTest__` export 추가 방안을 사용자와 **재논의** 후 도입 (현 단계에서는 도입하지 않음)
- fetch mock 호출 기록을 URL 기준으로 필터 (`/auth/refresh` 포함 호출 수 == 1)

**완료 기준**: 위 4 케이스 green.

**커밋**: `test: apiClient refresh 동시성·토큰 추출 경로`

---

## T4 — apiClient refresh 엣지 케이스

**보장할 동작**: refresh 실패 / `_isRetry` / 재시도 경로의 204 처리.

**선행 테스트**:

- refresh 엔드포인트가 401 반환 → `useAuthStore.clearAuth` 호출 + 호출자에게 에러 전파
- `_isRetry: true` 로 들어온 요청은 401 받아도 refresh 시도 안 함 (fetch 추가 호출 없음)
- refresh 성공 후 재시도 응답이 204 → 빈 객체 반환

**완료 기준**: 위 3 케이스 green. apiClient 총 테스트 12개 (T2 5 + T3 4 + T4 3).

**커밋**: `test: apiClient refresh 실패·재시도 엣지 케이스`

---

## T5 — submitTalentRegister 테스트 헬퍼

**보장할 동작**: 이후 task 에서 재사용할 `makeMethods()` 헬퍼 + 도메인 API 모킹 스캐폴드.

**선행 테스트** (`app/dashboard/profile/[profileId]/_actions/__tests__/submitTalentRegister.test.ts` 신규):

- 도메인 API `vi.mock` 이 잡혔는지 sanity check 1개 (예: `updateProfile` mock 호출 0회 확인)
- `makeMethods({ defaultValues, values, dirtyFields })` 가 `UseFormReturn` 인터페이스 (formState.dirtyFields, formState.defaultValues, getValues) 를 만족하는 객체 반환

**작업**

- `vi.mock` 대상: `@/lib/api/profiles`, `@/lib/api/educations`, `@/lib/api/experiences`, `@/lib/api/languages`, `@/lib/api/certifications`, `@/lib/api/awards`, `@/lib/api/expTags`, `@/lib/api/jobs`, `@/lib/api/customSkills`, `@/lib/api/profileThumbnail`, `@/lib/api/profilePortfolio`, `@/lib/api/workDriven`
- `@testing-library/react` 의 `renderHook(() => useForm({ defaultValues }))` 로 실제 RHF 인스턴스 생성 후 `setValue` 로 dirty 상태 유도. 복잡하면 stub 객체로 대체 가능 (`dirtyFields`, `defaultValues`, `getValues` 만 구현).

**완료 기준**: sanity 테스트 green. 헬퍼가 다음 task 에서 import 가능.

**커밋**: `test: submitTalentRegister 테스트 헬퍼 및 모킹 스캐폴드`

---

## T6 — submitTalentRegister 학력 POST/PUT 분기

**보장할 동작**: dirtyFields 대신 값 비교 기반 분기가 PUT 1회 / POST 1회를 정확히 호출.

**선행 테스트**:

- 기존 학력 2개 중 1개 필드 변경 + 신규 1개 → `updateEducation` 1회 (변경된 id 로) + `createEducations` 1회 (신규 항목 1개 배열)
- 학력 전부 dirty 없음 → `updateEducation` / `createEducations` 호출 0회
- 신규 항목이지만 `schoolName`/`major`/`degree` 모두 빈 값 → 호출 0회 (유효성 필터)

**완료 기준**: 위 3 케이스 green.

**커밋**: `test: submitTalentRegister 학력 분기 로직`

---

## T7 — submitTalentRegister 제출 순서·상태

**보장할 동작**: 이미지 파이프라인 순차성 · 병렬 단계 이후 `updateProfile` 이 마지막에 · `status` 가 모드 따라 달라짐.

**선행 테스트**:

- `dirtyFields.profile.avatar === true` 이고 `avatar` 가 File → `presignThumbnail` → `uploadThumbnailToS3` → `completeThumbnailUpload` → `upsertThumbnailLink` 순서로 호출 (호출 순서 assertion)
- `isTempSave: true` → 최종 `updateProfile` 호출 인자의 `status === "DRAFT"`
- `isTempSave: false` → `status === "COMPLETED"` + `updateProfile` 호출이 다른 모든 API 호출보다 **마지막** (호출 시점 타임스탬프 비교)
- parallelPromises 중 하나 reject → `submitTalentRegister` 가 `{ success: false, error }` 반환 (전체 실패 동작 명시 고정)

**완료 기준**: 위 4 케이스 green. submit 총 테스트 8개 (T5 1 + T6 3 + T7 4).

**커밋**: `test: submitTalentRegister 업로드 순서·상태·실패 처리`

---

## T8 — GitHub Actions CI 워크플로우

**보장할 동작**: push / PR on `main` 에서 type-check + test 자동 실행.

**선행 테스트**: 본 task 는 CI 파일이라 자체 테스트 없음.

**작업**

- `.github/workflows/test.yml` 신규
  - `on: push/pull_request` on `main`
  - Node 20, `npm ci`, `HUSKY=0` job env
  - steps: `type-check` → `test:coverage`
  - `actions/upload-artifact@v4` 로 `coverage/` 업로드 (if: always)
  - `lint` step 은 기존 코드 warning 70개로 `--max-warnings=0` 실패하므로 본 PR 에서는 CI 에 포함하지 않음. 별도 이슈에서 warning 을 0으로 줄인 뒤 lint CI step 을 추가한다.

**완료 기준**: push 후 GitHub Actions 체크가 green.

**커밋**: `chore: GitHub Actions test workflow 추가`

---

## 하네스 체크리스트 (task 외)

- [ ] plan 승인 직후 이슈 생성 (`.agents/workflow.md` 단계 1)
- [ ] 브랜치 `test/<issue-num>-phase3-tests` 체크아웃
- [ ] T1 커밋 push 직후 draft PR 생성 (task 체크리스트 본문에 포함)
- [ ] 각 task 완료마다 PR 본문 체크박스 업데이트
- [ ] T8 후 CI 녹색 확인 → `gh pr ready`

## 수치 목표 (참고)

- apiClient 테스트 케이스: 12
- submitTalentRegister 테스트 케이스: 8
- 합계: 20

숫자는 달성 못해도 DoD (plan.md) 의 각 케이스가 통과하면 완료 처리.

## 후속 과제 (본 PR 범위 외, 별도 task/PR 로 논의)

- `.husky/pre-push` 에 `npm test` 추가 — 현재 주석 `# Phase 2 에서 'npm test' 추가 예정`. T1~T6 동안은 테스트가 부분적이라 추가 시 push 차단 위험. T7 완료 시점 또는 Phase 4 진입 전에 재검토.
- `npm run lint` 가 현재 `--max-warnings=0` 설정 + 기존 코드 warning 70 개로 실패. 본 PR 에서 lint 이슈를 전부 해결하는 건 스코프 누수이므로 T8 에서는 CI 에 lint 를 넣지 않는다. 별도 이슈로 warning 70 → 0 작업을 진행하고, 완료 후 lint step 을 CI 에 추가한다.
