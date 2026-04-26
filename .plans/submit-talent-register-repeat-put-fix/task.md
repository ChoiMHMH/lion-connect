# submitTalentRegister 반복 PUT 제거 - task 분할

## Task 1. 임시저장 성공 후 dirty 초기화로 jobs/expTags 반복 PUT 제거

- 목표
  - 임시저장 성공 후 최신 서버 응답을 `defaultValues`로 반영할 때 `dirtyFields`도 함께 초기화해서, 같은 값으로 다시 임시저장해도 `jobs`, `expTags`의 `PUT`이 반복 호출되지 않게 만든다.
- 먼저 실패해야 하는 테스트
  - [app/dashboard/profile/[profileId]/__tests__/submitTalentRegister.integration.test.tsx](/C:/Users/Min/Desktop/lion-connect-frontend/app/dashboard/profile/[profileId]/__tests__/submitTalentRegister.integration.test.tsx)
  - `jobs dirtyFields integration (T5)`의 "job.role 을 변경한 뒤 성공적으로 임시저장하면 reset 이후 다시 저장해도 updateJobs 를 다시 호출하지 않는다"
  - `expTags dirtyFields integration (T12)`의 "job.experiences 를 바꾼 뒤 성공적으로 임시저장하면 reset 이후 다시 저장해도 updateExpTags 를 다시 호출하지 않는다"
- 구현 범위
  - [app/dashboard/profile/[profileId]/page.tsx](/C:/Users/Min/Desktop/lion-connect-frontend/app/dashboard/profile/[profileId]/page.tsx) 의 임시저장 성공 후 `reset` 옵션을 최소 범위로 수정한다.
  - 필요하면 같은 integration 파일에서 배열 섹션 회귀 기대값을 유지해 `reset` 정책 변경이 기존 계약을 깨지 않았는지 함께 검증한다.
- 의존성
  - 없음
- 완료 기준
  - `jobs` 반복 PUT integration 테스트가 red -> green 으로 통과한다.
  - `expTags` 반복 PUT integration 테스트가 red -> green 으로 통과한다.
  - 배열 섹션의 "reset 후 재저장 시 중복 POST 없음" regression 테스트가 계속 통과한다.
  - `npm test -- submitTalentRegister.integration` 통과
  - `npm test -- submitTalentRegister` 통과
  - `npm run type-check` 통과
