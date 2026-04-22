# submitTalentRegister 남은 섹션 분기·payload 테스트

## 무엇을 / 왜

**무엇을**

- `submitTalentRegister`의 기존 미포함 범위였던 경력, 활동, 언어, 자격증, 링크, jobs, expTags, customSkills, workDriven 섹션별 분기와 payload를 단위 테스트로 고정한다.
- 기존 테스트 헬퍼와 도메인 API mock을 재사용하되, 필요한 경우 섹션별 fixture/helper를 추가해 테스트 가독성을 유지한다.
- 테스트 중 실제 버그가 드러나면 해당 동작을 실패 테스트로 먼저 고정하고, 최소 수정으로 green을 만든다.

**왜**

- 이전 PR은 전체 `submitTalentRegister` 커버리지가 아니라 대표 섹션인 학력과 공통 플로우를 목표로 했다.
- 남은 섹션들은 모두 유사한 POST/PUT/skip 분기처럼 보이지만, 필수값 필터, 날짜 변환, default payload, 최종 제출과 임시 저장 조건이 섹션마다 다르다.
- 실제로 다른 영역에서 에러가 있었으므로, 후속 PR에서는 남은 범위를 모두 테스트해 회귀 방지와 잠재 버그 발견을 목표로 한다.

## 현재 상태 진단

- 현재 브랜치: `chore/5-lint-warning-ci-gate`
- 기존 테스트 위치: `app/dashboard/profile/[profileId]/_actions/__tests__/submitTalentRegister.test.ts`
- 기존 헬퍼 위치: `app/dashboard/profile/[profileId]/_actions/__tests__/submitTalentRegister.helpers.ts`
- 현재 `submitTalentRegister` 테스트 커버리지:
  - T5: 도메인 API mock sanity, `makeMethods` sanity
  - T6: 학력 POST/PUT/skip 대표 분기
  - T7: avatar 업로드 순서, `DRAFT`/`COMPLETED` status, parallel 실패 처리
- 아직 직접 검증하지 않은 섹션:
  - 경력: `careers` 기존 변경 PUT, 신규 POST, 빈 항목 skip, 날짜 변환, `isCurrent` 기본값
  - 활동: `activities` 기존 변경 PUT, 신규 POST, title 없는 항목 skip, `organization: "default"`
  - 언어: `languages` 기존 변경 PUT, 신규 POST, languageName 없는 항목 skip, `level: "default"`
  - 자격증: `certificates` 기존 변경 PUT, 신규 POST, name 없는 항목 skip, `issuer: "default"`
  - 링크: `links` 유효 URL만 `upsertProfileLink` PUT, 빈 URL skip, 여러 type payload
  - jobs: 최종 제출은 항상 유효 role을 PUT, 임시 저장은 dirty일 때만 PUT, 알 수 없는 role은 skip
  - expTags: 문자열 key를 ID로 변환해 PUT, 알 수 없는 key 필터, 임시 저장 dirty 조건, 빈 배열 skip
  - customSkills: `methods.getValues("skills.main")` 기반으로 항상 PUT, 빈 이름 필터, 빈 배열도 삭제 payload로 PUT
  - workDriven: q1~q16이 모두 있을 때만 POST, 부분 응답은 skip, payload ordering
- 코드상 섹션 저장은 `parallelPromises`에 모은 뒤 `Promise.all`로 실행되고, 마지막에 `updateProfile`이 호출된다. 따라서 섹션 테스트는 불필요한 다른 섹션 호출을 최소화하는 fixture 제어가 중요하다.

## 해결책

- 기존 `submitTalentRegister.test.ts`에 이어서 섹션별 describe 블록을 추가하거나, 파일이 과도하게 커지면 같은 디렉터리에 섹션 테스트 파일을 분리한다. mock 중복 비용과 가독성을 비교해 task 단계에서 최종 결정한다.
- 배열형 CRUD 섹션은 학력 테스트 패턴을 반복한다: defaultValues에 존재하는 id + 값 변경은 PUT, defaultValues에 없는 항목은 batch POST, 필수값이 없는 항목은 skip, API 응답은 `updatedValues`에 반영되는지 확인한다.
- 단순 PUT 섹션은 임시 저장과 최종 제출 조건을 나눠 테스트한다: jobs, expTags, customSkills는 호출 조건과 payload가 핵심이므로 dirtyFields/defaultValues보다 실제 호출 인자를 우선 검증한다.
- 링크와 workDriven은 경계값을 별도로 둔다: 링크는 빈 URL 제거와 type별 PUT payload, workDriven은 16개 완성 여부와 `questionId`/`score` 배열 순서를 검증한다.
- 각 task는 TDD 순서를 지킨다. 먼저 실패 테스트를 추가하고 `npm test -- submitTalentRegister`로 red를 확인한 뒤, 버그가 있으면 최소 구현 수정으로 green을 만든다.

## 트레이드오프

| 선택 | 장점 | 단점 |
|---|---|---|
| 남은 섹션을 모두 테스트 | 이번에 실제 누락과 payload 오류를 찾을 가능성이 높음 | 테스트 수와 PR 크기가 커짐 |
| 섹션별 독립 테스트 | 실패 원인 파악이 쉽고 회귀 지점이 명확함 | 유사 fixture가 반복될 수 있음 |
| 기존 mock/헬퍼 재사용 | PR 변경량이 작고 기존 패턴과 일관됨 | 현재 테스트 파일이 더 커질 수 있음 |
| payload 중심 assertion | 백엔드 계약 회귀를 잘 잡음 | 구현 내부 구조가 바뀌면 테스트 보수 비용 증가 |
| 발견 버그를 같은 PR에서 수정 | 테스트와 수정 근거가 한 PR에 남음 | 순수 테스트 PR보다 리뷰 범위가 넓어짐 |

## 대안

1. **대표 섹션 몇 개만 더 추가**
   - 기각 이유: 이번 요청의 목표가 남은 미포함 범위를 전부 확인하는 것이고, 과거 실제 에러가 있었다는 맥락상 부분 확장은 충분하지 않다.
2. **통합 테스트 1개로 전체 submit payload를 한 번에 검증**
   - 기각 이유: 어떤 섹션 분기가 깨졌는지 찾기 어렵고, dirty/defaultValues/필수값 skip 같은 경계 조건을 놓치기 쉽다.
3. **리팩토링을 먼저 하고 테스트 작성**
   - 기각 이유: 현재 목적은 기존 동작을 먼저 관찰하고 오류를 찾는 것이다. 테스트 없이 구조부터 바꾸면 회귀와 의도 변경을 구분하기 어렵다.
4. **MSW 또는 실제 API에 가까운 테스트로 전환**
   - 기각 이유: 이 액션의 핵심은 도메인 API 호출 분기와 payload 조립이다. 현재는 `vi.mock` 기반 단위 테스트가 더 빠르고 실패 원인이 선명하다.

## 완료 기준

- [ ] 경력 섹션 테스트 통과
  - 기존 변경 1건 → `updateExperience` payload 검증
  - 신규 1건 → `createExperiences` batch payload 검증
  - 빈 신규 항목 skip
  - 응답 ID/날짜가 반환 `data.careers`에 반영됨
- [ ] 활동 섹션 테스트 통과
  - 기존 변경 1건 → `updateAward` payload 검증
  - 신규 1건 → `createAwards` batch payload 검증
  - title 없는 항목 skip
  - `organization: "default"` 고정 payload 검증
- [ ] 언어 섹션 테스트 통과
  - 기존 변경 1건 → `updateLanguage` payload 검증
  - 신규 1건 → `createLanguages` batch payload 검증
  - languageName 없는 항목 skip
  - `level: "default"` 고정 payload 검증
- [ ] 자격증 섹션 테스트 통과
  - 기존 변경 1건 → `updateCertification` payload 검증
  - 신규 1건 → `createCertifications` batch payload 검증
  - name 없는 항목 skip
  - `issuer: "default"` 고정 payload 검증
- [ ] 링크 섹션 테스트 통과
  - URL 있는 링크만 `upsertProfileLink` PUT 호출
  - 빈 URL 또는 type 없는 링크 skip
  - type, url, `contentType: "text/uri-list"`, `fileSize: 0` payload 검증
- [ ] jobs 섹션 테스트 통과
  - 최종 제출은 dirty 여부와 무관하게 유효 role ID PUT
  - 임시 저장은 job dirty일 때만 PUT
  - 알 수 없는 role code는 API 호출 없음
- [ ] expTags 섹션 테스트 통과
  - key 배열이 ID 배열 payload로 변환됨
  - 알 수 없는 key는 필터됨
  - 임시 저장 dirty 조건과 빈 배열 skip 검증
- [ ] customSkills 섹션 테스트 통과
  - `skills.main` 이름만 추출해 PUT
  - 빈/공백 이름 필터
  - 빈 배열도 `{ customSkills: [] }`로 PUT
- [ ] workDriven 섹션 테스트 통과
  - q1~q16 모두 있으면 `submitWorkDrivenTest` 호출
  - 일부만 있으면 호출 없음
  - `{ answers: [{ questionId, score }] }` 순서와 payload 검증
- [ ] 관련 실패 경로가 발견되면 실패 테스트 → 최소 수정 → green 순서로 해결
- [ ] `npm test -- submitTalentRegister` 통과
- [ ] `npm run type-check` 통과
- [ ] 필요한 경우 `npm run test:coverage` 통과
- [ ] 승인 후 `.agents/workflow.md`에 따라 이슈, 브랜치, draft PR을 만들고 task 단위 커밋으로 진행

## 다음 단계

사용자가 이 계획에 "진행"이라고 승인하면 `.plans/submit-talent-register-remaining-tests/task.md`를 작성한다. task.md에서는 각 task를 커밋 단위로 나누고, task마다 먼저 쓸 실패 테스트와 검증 명령을 명시한다.
