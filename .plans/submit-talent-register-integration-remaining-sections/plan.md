# submitTalentRegister integration 잔여 섹션 확장

## 무엇을 / 왜
**무엇을**

- 이미 만든 `submitTalentRegister` integration 하네스를 재사용해서, 아직 UI 흐름으로 직접 증명하지 못한 잔여 섹션의 저장 계약을 확장 검증한다.
- 배열 섹션은 `EducationSection`과 같은 축으로 `reset 후 재저장 시 중복 POST가 나가지 않는지`를 남은 섹션에도 추가한다.
- dirtyFields 기반 섹션은 `jobs`에 이어 `expTags`까지 반복 임시저장 시 PUT 재호출 계약을 UI 레벨에서 고정한다.

**왜**

- 현재 draft PR `#10`은 대표 케이스로 `education`, `jobs`, `toast`까지는 잡았지만, 동일한 위험 패턴의 모든 섹션을 UI 기준으로 다 고정한 상태는 아니다.
- `submitTalentRegister.ts`는 배열 섹션을 `formState.defaultValues` 비교로, `jobs/expTags`를 `dirtyFields`로 판단한다. 이 분기는 unit test로는 커버돼도, `page.tsx`의 `reset(..., { keepDirty: true })`까지 포함한 실제 저장 흐름은 integration 테스트가 필요하다.
- 백엔드가 내려가 있어 E2E로 가기 어렵기 때문에, 지금 가장 현실적으로 추가 신뢰도를 올릴 수 있는 수단이 Testing Library 기반 integration 테스트다.

## 현재 상태 진단

- 대표 케이스를 고정한 기존 작업은 PR `#10`으로 머지되었다.
- 현재 브랜치: `test/13-submit-talent-register-integration-remaining-sections`
- 현재 이 follow-up 작업의 이슈: `#13`
- 이미 integration으로 직접 확인한 항목
  - `EducationSection`: 첫 임시저장 후 reset, 두 번째 임시저장에서 중복 POST 방지
  - `EducationSection`: 삭제 후 재저장 흐름
  - `jobs`: dirtyFields 기반 반복 PUT 가능 여부
  - 성공/실패 토스트 계약
- 아직 UI integration으로 직접 확인하지 못한 항목
  - 배열 섹션: `careers`, `activities`, `languages`, `certificates`
  - dirtyFields 섹션: `expTags`
- `links`, `customSkills`, `workDrivenTest`는 현재 코드상 동일한 dirtyFields 패턴이 아니라 별도 계약을 가진다.
  - `links`: 유효 링크가 있으면 type 기반 PUT
  - `customSkills`: 값이 있으면 항상 PUT
  - `workDrivenTest`: 16문항 완성 시 POST
- 따라서 이번 후속 범위는 "학력과 같은 reset 후 재저장 위험"과 "dirtyFields 반복 PUT 위험"에 직접 대응하는 섹션으로 제한하는 것이 맞다.

## 해결책

- 기존 `submitTalentRegister.integration.helpers.tsx` 하네스와 mock 세트를 유지하고, 잔여 섹션별 최소 입력 UI만 추가해 테스트를 확장한다.
- 배열 섹션은 `career`, `activity`, `language`, `certificate` 각각에 대해 다음 계약을 고정한다.
  - 첫 임시저장 시 create API 1회
  - 응답 id 반영 후 reset
  - 같은 값으로 다시 임시저장해도 create API 추가 호출 없음
- dirtyFields 섹션은 `expTags`에 대해 다음 계약을 고정한다.
  - 변경 없으면 임시저장 시 PUT 없음
  - 변경 후 임시저장 시 PUT 1회
  - 성공 reset 이후에도 `keepDirty: true` 계약 때문에 반복 임시저장에서 PUT이 다시 나가는지 여부를 명시적으로 고정
- 섹션별 입력/selector 차이가 커지면 테스트 유틸을 소폭 일반화하되, page 전체 렌더링으로 범위를 넓히지는 않는다.
- 새 이슈 `#13`과 별도 브랜치/PR로 follow-up을 분리해, 1차 머지분(PR `#10`)과 2차 확장 작업의 범위를 구분한다.

## 트레이드오프

| 선택 | 장점 | 단점 |
|---|---|---|
| 기존 하네스 재사용 + 섹션별 테스트 추가 | 이미 검증된 구조를 재사용해 속도와 일관성을 확보할 수 있다 | 테스트 파일이 길어지고 섹션별 selector 유지비가 늘어난다 |
| 각 섹션을 개별 integration으로 분리 검증 | 어떤 섹션 계약이 깨졌는지 바로 드러난다 | 유사한 테스트 코드가 다소 반복된다 |
| dirtyFields 반복 PUT을 "현재 계약"으로 먼저 고정 | 프론트/백엔드 책임 경계를 논의할 근거가 생긴다 | 계약 자체가 바뀌면 테스트도 함께 수정해야 한다 |
| `links/customSkills/workDriven`를 이번 범위에서 제외 | 지금 사용자 우선순위인 위험 축에 집중할 수 있다 | 반복 저장 전체를 한 번에 끝내지는 못한다 |

## 대안

1. **현재 대표 케이스만 유지하고 후속 테스트는 생략한다**
   - 기각 이유: 사용자는 남은 섹션까지 같은 위험을 직접 고정하길 원하고 있고, 지금 상태로는 "교육만 확인됨"이라는 설명을 계속 붙여야 한다.
2. **백엔드 복구 후 E2E로만 검증한다**
   - 기각 이유: 현재 바로 진행할 수 없고, 프론트 상태 관리 문제를 늦게 발견하게 된다.
3. **`TalentRegisterPage` 전체를 렌더링하는 큰 integration으로 한 번에 검증한다**
   - 기각 이유: router/store/query mock 비용이 커지고, 실패 원인 추적이 어려워진다.
4. **`links/customSkills/workDriven`까지 이번에 같이 넣는다**
   - 기각 이유: 반복 호출 성격은 있지만 이번에 사용자가 집은 두 위험 축과는 다르고, 범위가 과도하게 커진다.

## 완료 기준

- [x] 새 follow-up `task.md`가 작성된다
- [x] `careers` reset 후 재저장 integration 테스트가 추가된다
- [x] `activities` reset 후 재저장 integration 테스트가 추가된다
- [x] `languages` reset 후 재저장 integration 테스트가 추가된다
- [x] `certificates` reset 후 재저장 integration 테스트가 추가된다
- [x] `expTags` dirtyFields 반복 PUT integration 테스트가 추가된다
- [x] 기존 `jobs` dirtyFields 테스트와 새 `expTags` 테스트의 계약 차이가 문서/PR 본문에 명확히 반영된다
- [x] `npm test -- submitTalentRegister.integration` 통과
- [x] 관련 `submitTalentRegister` unit test가 계속 통과
- [x] `npm run type-check` 통과
- [ ] 이번 후속 범위가 `links/customSkills/workDriven` 제외임이 plan/task에 명시된다

## 다음 단계

사용자가 이 계획에 `진행`이라고 확인하면 `.plans/submit-talent-register-integration-remaining-sections/task.md`를 작성한다. task는 남은 배열 섹션과 `expTags` dirtyFields 검증을 커밋 단위로 분리하고, 기존 draft PR `#10`에 이어붙이는 기준으로 쪼갠다.
