# submitTalentRegister 반복 PUT 제거

## 무엇을 / 왜
**무엇을**

- 임시저장 성공 후 같은 값으로 다시 임시저장해도 `jobs`, `expTags`의 `PUT`이 반복 호출되지 않도록 프론트 상태 갱신 방식을 수정한다.
- 이 변경이 실제로 동작함을 `@testing-library/react` 기반 integration 테스트로 증명한다.
- 기존 배열 섹션의 `reset 후 재저장 시 중복 POST 방지` 계약은 유지되는지 함께 회귀 검증한다.

**왜**

- 현재 `page.tsx`의 임시저장 성공 처리에서 `methods.reset(result.data, { keepDirty: true, ... })`를 사용하고 있다.
- 동시에 `submitTalentRegister.ts`는 `jobs`, `expTags`를 `dirtyFields` 기준으로 `PUT`할지 판단한다.
- 이 조합 때문에 한 번 성공적으로 저장된 동일 값이라도, 다음 임시저장에서 다시 `updateJobs`, `updateExpTags`가 호출될 수 있다.
- 서버가 `PUT`를 멱등하게 처리해야 하는 건 맞지만, 프론트도 불필요한 반복 요청은 줄이는 편이 실무적으로 더 안전하고 깔끔하다.

## 현재 상태 진단

- 반복 `PUT`의 직접 원인
  - [page.tsx](/C:/Users/Min/Desktop/lion-connect-frontend/app/dashboard/profile/[profileId]/page.tsx:126) 임시저장 성공 후 `reset(..., { keepDirty: true, keepTouched: true, keepErrors: true })`
  - [submitTalentRegister.ts](/C:/Users/Min/Desktop/lion-connect-frontend/app/dashboard/profile/[profileId]/_actions/submitTalentRegister.ts:196) `jobs`는 `dirtyFields.job.category || dirtyFields.job.role`
  - [submitTalentRegister.ts](/C:/Users/Min/Desktop/lion-connect-frontend/app/dashboard/profile/[profileId]/_actions/submitTalentRegister.ts:210) `expTags`는 `dirtyFields.job.experiences`
- 이미 integration 테스트로 현재 계약이 고정되어 있다.
  - [submitTalentRegister.integration.test.tsx](/C:/Users/Min/Desktop/lion-connect-frontend/app/dashboard/profile/[profileId]/__tests__/submitTalentRegister.integration.test.tsx:1)
  - `jobs`: 두 번째 임시저장에서도 `updateJobs` 재호출
  - `expTags`: 두 번째 임시저장에서도 `updateExpTags` 재호출
- 반면 배열 섹션(`education/career/activity/language/certificate`)은 `defaultValues` 비교 기반이라, `reset` 후 재저장에서 중복 `POST`가 나가지 않는 것이 integration으로 확인됐다.

## 해결책

- 1차 후보 해법은 임시저장 성공 후 `reset` 시 `keepDirty: true`를 제거하는 것이다.
  - 즉, 서버가 받아준 최신 값이 새 `defaultValues`가 되었으면 dirty 상태도 같이 초기화한다.
  - `keepTouched`, `keepErrors` 유지 여부는 UX를 보며 최소 범위로 판단한다.
- 이 변경으로 해결되는지 다음 integration 테스트 기대값을 뒤집어 검증한다.
  - `jobs`: 첫 저장 후 두 번째 임시저장에서 `updateJobs`가 다시 호출되지 않아야 한다.
  - `expTags`: 첫 저장 후 두 번째 임시저장에서 `updateExpTags`가 다시 호출되지 않아야 한다.
- 배열 섹션 회귀 테스트는 그대로 유지해, `keepDirty` 제거가 `reset 후 중복 POST 방지`를 깨지 않는지 함께 확인한다.
- 만약 `keepDirty` 제거가 다른 UX를 깨면, 대안으로 저장 성공한 필드만 선택적으로 dirty 해제하는 방향을 검토한다.

## 트레이드오프

| 선택 | 장점 | 단점 |
|---|---|---|
| 성공 후 dirty 전체 해제 | 구현이 단순하고 반복 PUT 원인을 직접 제거한다 | 저장 직후 "수정됨" 표시가 사라져 UX가 달라질 수 있다 |
| 저장 성공 필드만 선택적으로 dirty 해제 | 영향 범위를 좁힐 수 있다 | RHF 상태 조작이 복잡해지고 유지비가 커진다 |
| 현재처럼 반복 PUT 허용 | 서버 idempotency에 맡길 수 있다 | 불필요한 네트워크, 로그 노이즈, race 가능성이 남는다 |
| action 내부에서 값 비교로 중복 PUT 방지 | page reset 정책과 독립적으로 동작할 수 있다 | jobs/expTags만 별도 규칙이 늘어나고 상태 기준이 분산된다 |

## 대안

1. **현재 동작을 유지하고 서버 멱등성만 요구한다**
   - 기각 이유: 서버가 안전해야 하는 건 맞지만, 프론트도 같은 저장 요청을 계속 보내지 않는 편이 더 낫다.
2. **Nav 쪽 debounce/in-flight 차단만 강화한다**
   - 기각 이유: 연타는 막을 수 있어도, "성공 후 다시 저장"에서 발생하는 반복 PUT은 해결하지 못한다.
3. **`jobs`, `expTags`만 action 내부 값 비교로 따로 막는다**
   - 기각 이유: 근본 원인은 dirty 상태가 저장 후에도 남는 점이고, 섹션별 예외 규칙이 늘어난다.
4. **반복 PUT 테스트를 삭제하고 현 계약으로 둔다**
   - 기각 이유: 이미 현재 동작을 명시적으로 확인했기 때문에, 바꾸기로 하면 테스트 기대값도 함께 바뀌어야 한다.

## 완료 기준

- [ ] fix용 `task.md`가 작성된다
- [ ] 임시저장 성공 후 dirty 상태 처리 방식이 수정된다
- [ ] `jobs` 반복 PUT integration 테스트가 "두 번째 저장에서 재호출 없음"으로 바뀌고 통과한다
- [ ] `expTags` 반복 PUT integration 테스트가 "두 번째 저장에서 재호출 없음"으로 바뀌고 통과한다
- [ ] 배열 섹션 reset 후 재저장 regression 테스트가 계속 통과한다
- [ ] `npm test -- submitTalentRegister.integration` 통과
- [ ] `npm test -- submitTalentRegister` 통과
- [ ] `npm run type-check` 통과
- [ ] PR 본문에 "반복 PUT 제거"와 검증 근거가 반영된다

## 다음 단계

이 계획에 사용자가 `진행`이라고 확인하면 `.plans/submit-talent-register-repeat-put-fix/task.md`를 작성한다. task는 먼저 failing integration 테스트 기대값을 뒤집고, 그다음 `page.tsx`의 성공 후 reset 정책을 최소 범위로 수정하는 순서로 쪼갠다.
