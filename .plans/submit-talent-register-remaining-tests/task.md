# submitTalentRegister 남은 섹션 분기·payload 테스트 — Task 분할

> plan: [plan.md](./plan.md)
> 이슈: #7 `test: submitTalentRegister 남은 섹션 분기·payload 테스트`
> 대상 브랜치: `test/7-submit-talent-register-remaining-tests`
> 원칙: task 1개 = 커밋 1개. 각 task는 실패 테스트 작성 → red 확인 → 최소 수정 → green 확인 순서로 진행한다.

## 본 PR 의 스코프

- **포함**: `submitTalentRegister`의 경력, 활동, 언어, 자격증, 링크, jobs, expTags, customSkills, workDriven 섹션별 분기와 payload 테스트. 테스트 중 발견되는 실제 버그의 최소 수정.
- **제외**: submit 로직의 구조적 리팩토링, API 클라이언트 테스트 추가, UI 컴포넌트 테스트, 백엔드 계약 변경.
- **기본 테스트 위치**: `app/dashboard/profile/[profileId]/_actions/__tests__/submitTalentRegister.test.ts`
- **기본 헬퍼 위치**: `app/dashboard/profile/[profileId]/_actions/__tests__/submitTalentRegister.helpers.ts`
- 테스트 파일이 과도하게 커지면 `submitTalentRegister.remaining.test.ts`로 분리할 수 있다. 단, mock 격리와 중복 비용을 감안해 첫 구현에서는 기존 파일 확장을 기본값으로 둔다.

## 의존성 순서

```
T1 경력
  └─► T2 활동
        └─► T3 언어
              └─► T4 자격증
                    └─► T5 링크
                          └─► T6 jobs
                                └─► T7 expTags
                                      └─► T8 customSkills
                                            └─► T9 workDriven
                                                  └─► T10 전체 검증·PR 정리
```

T1~T4는 같은 배열 CRUD 패턴이라 독립적이지만, fixture/helper가 누적될 수 있으므로 순차 진행한다. T6~T7은 같은 `values.job` 영역을 건드리므로 jobs를 먼저 고정한 뒤 expTags로 간다.

---

## T1 — 경력 섹션 분기·payload 테스트

**보장할 동작**: `careers`는 defaultValues에 있던 id가 변경되면 PUT, 새 항목은 batch POST, companyName/position이 모두 없으면 skip한다.

**먼저 쓸 실패 테스트**

- 기존 경력 2개 중 1개 변경 + 신규 1개 → `updateExperience` 1회, `createExperiences` 1회
- `updateExperience` payload:
  - `companyName`, `department`, `position`
  - `startDate: "yyyy-mm-01"`
  - `endDate: "yyyy-mm-01"` 또는 빈 값이면 `undefined`
  - `isCurrent`, `description`
- 신규 batch payload도 같은 날짜 변환과 `isCurrent: false` 기본값을 검증
- `createExperiences` 응답 id/date가 반환 `res.data.careers`에 반영됨
- companyName/position이 모두 빈 신규 항목은 `updateExperience`/`createExperiences` 호출 0회

**구현 방침**

- 필요하면 `buildValues({ careers })` 형태의 작은 테스트 헬퍼를 describe 내부에 둔다.
- 실패가 테스트 fixture 문제인지 실제 submit 버그인지 분리하기 위해 각 케이스는 관련 API 호출만 assert한다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: 경력 섹션 테스트가 green이고 기존 submit 테스트가 깨지지 않는다.

**커밋**: `test: submitTalentRegister 경력 분기와 payload 검증`

---

## T2 — 활동 섹션 분기·payload 테스트

**보장할 동작**: `activities`는 title이 있는 항목만 저장하고, 기존 변경은 PUT, 신규는 batch POST로 처리한다.

**먼저 쓸 실패 테스트**

- 기존 활동 2개 중 1개 변경 + 신규 1개 → `updateAward` 1회, `createAwards` 1회
- `updateAward` payload:
  - `title`
  - `organization: "default"`
  - `awardDate: "yyyy-mm-01"`
  - `description`
- `createAwards` batch payload도 `organization: "default"`를 포함
- `createAwards` 응답 id/date가 반환 `res.data.activities`에 반영됨
- title이 빈 신규 항목은 `updateAward`/`createAwards` 호출 0회

**구현 방침**

- 학력/경력과 같은 값 비교 패턴을 따르되, 활동의 필수값은 title 하나라는 점을 명확히 assert한다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: 활동 섹션 테스트가 green이고 기존 submit 테스트가 깨지지 않는다.

**커밋**: `test: submitTalentRegister 활동 분기와 payload 검증`

---

## T3 — 언어 섹션 분기·payload 테스트

**보장할 동작**: `languages`는 languageName이 있는 항목만 저장하고, 고정 payload `level: "default"`를 포함한다.

**먼저 쓸 실패 테스트**

- 기존 언어 2개 중 1개 변경 + 신규 1개 → `updateLanguage` 1회, `createLanguages` 1회
- `updateLanguage` payload:
  - `languageName`
  - `level: "default"`
  - `issueDate: "yyyy-mm-01"`
- `createLanguages` batch payload도 `level: "default"` 포함
- `createLanguages` 응답 id/date가 반환 `res.data.languages`에 반영됨
- languageName이 빈 신규 항목은 `updateLanguage`/`createLanguages` 호출 0회

**구현 방침**

- 기존 값과 동일한 언어는 PUT하지 않는지 함께 확인해 값 비교 분기를 고정한다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: 언어 섹션 테스트가 green이고 기존 submit 테스트가 깨지지 않는다.

**커밋**: `test: submitTalentRegister 언어 분기와 payload 검증`

---

## T4 — 자격증 섹션 분기·payload 테스트

**보장할 동작**: `certificates`는 name이 있는 항목만 저장하고, 고정 payload `issuer: "default"`를 포함한다.

**먼저 쓸 실패 테스트**

- 기존 자격증 2개 중 1개 변경 + 신규 1개 → `updateCertification` 1회, `createCertifications` 1회
- `updateCertification` payload:
  - `name`
  - `issuer: "default"`
  - `issueDate: "yyyy-mm-01"`
- `createCertifications` batch payload도 `issuer: "default"` 포함
- `createCertifications` 응답 id/date가 반환 `res.data.certificates`에 반영됨
- name이 빈 신규 항목은 `updateCertification`/`createCertifications` 호출 0회

**구현 방침**

- 언어 task의 패턴을 재사용하되, API 함수와 필드명 차이를 payload assertion으로 고정한다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: 자격증 섹션 테스트가 green이고 기존 submit 테스트가 깨지지 않는다.

**커밋**: `test: submitTalentRegister 자격증 분기와 payload 검증`

---

## T5 — 링크 섹션 분기·payload 테스트

**보장할 동작**: `links`는 URL이 있는 항목만 type별 `upsertProfileLink(..., "PUT")`로 저장한다.

**먼저 쓸 실패 테스트**

- URL이 있는 `LINK`, `LINK2` 2개 → `upsertProfileLink` 2회
- 각 호출 인자:
  - profileId
  - link type
  - `{ type, url, originalFilename: "", contentType: "text/uri-list", fileSize: 0 }`
  - method `"PUT"`
- URL이 빈 문자열 또는 공백인 항목은 skip
- type이 없는 항목은 skip
- `values.links`가 빈 배열이면 링크 저장 호출 0회

**구현 방침**

- thumbnail 업로드의 `upsertThumbnailLink`와 혼동되지 않도록 `profileThumbnail` mock의 `upsertProfileLink` 호출만 검증한다.
- 기존 avatar/portfolio 테스트와 겹치지 않도록 dirtyFields는 비워 둔다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: 링크 섹션 테스트가 green이고 기존 upload/link 관련 테스트가 깨지지 않는다.

**커밋**: `test: submitTalentRegister 링크 payload 검증`

---

## T6 — jobs 섹션 분기·payload 테스트

**보장할 동작**: 최종 제출은 dirty 여부와 무관하게 유효 role ID를 PUT하고, 임시 저장은 job category/role이 dirty일 때만 PUT한다.

**먼저 쓸 실패 테스트**

- `isTempSave: false`, `values.job.role = "frontend"`, dirty 없음 → `updateJobs(profileId, { ids: [1] })`
- `isTempSave: true`, dirty 없음 → `updateJobs` 호출 0회
- `isTempSave: true`, `dirtyFields.job.role = true` → `updateJobs(profileId, { ids: [1] })`
- `isTempSave: true`, `dirtyFields.job.category = true`이고 role 유효 → `updateJobs(profileId, { ids: [1] })`
- role code가 알 수 없는 값이면 dirty/최종 제출이어도 `updateJobs` 호출 0회

**구현 방침**

- `findJobRoleByCode`의 현재 상수 기준으로 `frontend` → role id 1을 사용한다.
- expTags가 섞이지 않도록 `values.job.experiences`는 빈 배열로 둔다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: jobs 섹션 테스트가 green이고 status/updateProfile 테스트가 깨지지 않는다.

**커밋**: `test: submitTalentRegister jobs 분기와 role id payload 검증`

---

## T7 — expTags 섹션 분기·payload 테스트

**보장할 동작**: `job.experiences`의 문자열 key는 expTag ID로 변환되고, 알 수 없는 key는 필터된다.

**먼저 쓸 실패 테스트**

- `isTempSave: false`, `experiences = ["bootcamp", "major"]` → `updateExpTags(profileId, { ids: [1, 4] })`
- `isTempSave: true`, dirty 없음 → `updateExpTags` 호출 0회
- `isTempSave: true`, `dirtyFields.job.experiences = true` → ID payload PUT
- `experiences = ["bootcamp", "unknown"]` → `{ ids: [1] }`
- `experiences = []` 또는 모두 unknown → `updateExpTags` 호출 0회

**구현 방침**

- TypeScript상 unknown key가 필요하면 테스트에서 `as TalentRegisterFormValues["job"]["experiences"]`처럼 최소 범위 단언을 사용한다.
- jobs 호출이 섞이지 않도록 role은 빈 문자열로 둔다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: expTags 섹션 테스트가 green이고 jobs 테스트와 충돌하지 않는다.

**커밋**: `test: submitTalentRegister expTags id 변환과 분기 검증`

---

## T8 — customSkills 섹션 payload 테스트

**보장할 동작**: `customSkills` 저장은 `methods.getValues("skills.main")`에서 이름만 추출해 항상 PUT하고, 빈 이름은 제외한다.

**먼저 쓸 실패 테스트**

- `skills.main = [{ name: "React" }, { name: " TypeScript " }]` → `updateCustomSkills(profileId, { customSkills: ["React", " TypeScript "] })`
- name이 `""`, `"   "`, undefined인 항목은 제외
- `skills.main = []` → `updateCustomSkills(profileId, { customSkills: [] })`
- `skills.main`이 배열이 아니거나 undefined이면 `updateCustomSkills` 호출 0회

**구현 방침**

- 현재 구현은 trim 결과로 빈 값만 필터하고 원본 name 문자열을 push한다. 테스트도 현재 계약을 먼저 고정한다.
- undefined 케이스는 `makeMethods`의 values 조합으로 재현한다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: customSkills 섹션 테스트가 green이고 기존 "updateProfile이 마지막" 테스트의 skills 호출 전제가 유지된다.

**커밋**: `test: submitTalentRegister customSkills payload 검증`

---

## T9 — workDriven 섹션 분기·payload 테스트

**보장할 동작**: `workDrivenTest`는 q1~q16이 모두 있을 때만 제출하고, payload는 questionId 순서와 score를 유지한다.

**먼저 쓸 실패 테스트**

- q1~q16 모두 존재 → `submitWorkDrivenTest(profileId, { answers })` 1회
- answers payload:
  - 길이 16
  - 첫 항목 `{ questionId: 1, score: values.workDrivenTest.q1 }`
  - 마지막 항목 `{ questionId: 16, score: values.workDrivenTest.q16 }`
  - 전체 순서가 1부터 16까지
- q1~q15만 있거나 중간 q가 빠진 경우 → `submitWorkDrivenTest` 호출 0회
- `workDrivenTest`가 undefined 또는 빈 객체 → 호출 0회

**구현 방침**

- score 값은 1~5 범위의 서로 다른 값을 섞어 순서 assertion이 의미 있게 만든다.

**검증**

- `npm test -- submitTalentRegister`

**완료 기준**: workDriven 섹션 테스트가 green이고 전체 submit 테스트가 통과한다.

**커밋**: `test: submitTalentRegister workDriven payload 검증`

---

## T10 — 전체 검증·PR 정리

**보장할 동작**: 이번 PR의 테스트와 타입 검사가 로컬에서 통과하고, draft PR 본문이 실제 task 상태를 반영한다.

**먼저 쓸 테스트 / 검증**

- `npm test -- submitTalentRegister`
- `npm run type-check`
- 필요 시 `npm run test:coverage`

**작업**

- 실패한 검증이 있으면 원인 task로 돌아가 수정하고 해당 task 커밋에 포함한다.
- 첫 커밋 push 이후 draft PR 생성:
  - title: `test: submitTalentRegister 남은 섹션 테스트 (#7)`
  - body: `Closes #7`, task 체크리스트, 테스트 명령, 리스크/롤백 포함
- task 완료마다 PR 본문 체크박스 업데이트.
- 모든 task 완료 + CI green 후 `gh pr ready`.

**완료 기준**: 로컬 검증과 PR CI가 green이고, PR이 ready 상태로 전환된다.

**커밋**: 별도 코드 변경이 없다면 커밋 없음. 문서/PR 본문만 필요하면 `docs: submitTalentRegister 후속 테스트 작업 상태 정리`.

---

## 하네스 체크리스트

- [x] plan 승인
- [x] 이슈 생성: #7
- [x] 브랜치 생성: `test/7-submit-talent-register-remaining-tests`
- [ ] task 승인
- [ ] T1 완료 후 첫 커밋 push
- [ ] draft PR 생성
- [ ] task 완료마다 PR 본문 체크박스 업데이트
- [ ] 전체 검증 green
- [ ] CI green
- [ ] `gh pr ready`

## 승인 후 첫 작업

사용자가 이 task 분할에 "좋아"라고 승인하면 T1부터 착수한다. T1의 첫 동작은 경력 섹션 실패 테스트를 추가하고 `npm test -- submitTalentRegister`로 red를 확인하는 것이다.
