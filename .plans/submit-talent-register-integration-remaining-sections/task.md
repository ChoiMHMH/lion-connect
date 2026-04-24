# submitTalentRegister integration 잔여 섹션 확장 Task 분할

> plan: [plan.md](./plan.md)
> 이슈: `#13`
> 대상 브랜치: `test/13-submit-talent-register-integration-remaining-sections`
> 대상 PR: `TBD`
> 원칙: task 1개 = 커밋 1개. 각 task는 실패 테스트 작성으로 시작하고, green 확인 후 최소 수정만 포함한다.
> 범위 제외: `links`, `customSkills`, `workDrivenTest`

## 이번 확장의 위치

- 기존 plan/task의 T1~T7은 이미 대표 케이스를 고정했다.
  - 하네스
  - Nav debounce / validation
  - Education reset 후 재저장
  - Education 삭제 후 재저장
  - jobs dirtyFields 반복 PUT
  - toast 계약
- 이번 문서는 그 위에 이어지는 2차 확장 task만 다룬다.
- PR `#10`은 이미 머지되었고, 이번 문서는 그 이후 follow-up 작업만 다룬다.

## 작업 순서

```text
T8 Career reset 후 재저장
  -> T9 Activities reset 후 재저장
    -> T10 Languages reset 후 재저장
      -> T11 Certificates reset 후 재저장
        -> T12 expTags dirtyFields 반복 PUT
          -> T13 전체 검증 / PR 반영
```

---

## T8. CareerSection reset 후 재저장 integration

**보장할 동작**

- 새 경력을 추가해 임시저장하면 `createExperiences`가 1회 호출된다.
- 응답 id가 reset으로 반영된 뒤 같은 값으로 다시 임시저장해도 `createExperiences`가 다시 호출되지 않는다.

**먼저 쓸 실패 테스트**

- `CareerSection`을 렌더링하고 항목 추가 후 필수값을 입력한다.
- 첫 임시저장에서 `createExperiences` 1회를 확인한다.
- 응답 id 반영 후 두 번째 임시저장에서 `createExperiences` 추가 호출이 없음을 확인한다.

**구현 메모**

- 기존 `EducationSection` 테스트 패턴을 최대한 재사용한다.
- selector 차이만 보조 helper로 흡수하고, 하네스 구조는 바꾸지 않는다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: 경력 배열의 reset 후 재저장 계약이 integration으로 고정된다.

**커밋**: `test: 경력 임시저장 reset 후 중복 POST 방지 검증`

---

## T9. ActivitiesSection reset 후 재저장 integration

**보장할 동작**

- 새 활동을 추가해 임시저장하면 `createAwards`가 1회 호출된다.
- reset 이후 같은 값으로 다시 저장해도 중복 POST가 나가지 않는다.

**먼저 쓸 실패 테스트**

- 활동 항목 추가, 필수값 입력, 임시저장 2회 흐름을 테스트한다.

**구현 메모**

- 활동 섹션의 날짜/텍스트 입력 selector를 안정적으로 잡는다.
- 필요 시 섹션 공통 입력 helper를 가볍게 일반화한다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: 활동 배열의 reset 후 재저장 계약이 integration으로 고정된다.

**커밋**: `test: 활동 임시저장 reset 후 중복 POST 방지 검증`

---

## T10. LanguagesSection reset 후 재저장 integration

**보장할 동작**

- 새 언어를 추가해 임시저장하면 `createLanguages`가 1회 호출된다.
- reset 이후 같은 값으로 다시 저장해도 중복 POST가 나가지 않는다.

**먼저 쓸 실패 테스트**

- 언어 항목 추가, 언어명/시험명/점수 등 저장 조건을 만족하는 입력을 넣고 임시저장 2회를 검증한다.

**구현 메모**

- `LanguagesSection`의 select/input 조합을 실제 사용자 흐름 기준으로 채운다.
- 테스트가 불안정하면 입력 helper를 섹션 내부에 한정해 추가한다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: 언어 배열의 reset 후 재저장 계약이 integration으로 고정된다.

**커밋**: `test: 언어 임시저장 reset 후 중복 POST 방지 검증`

---

## T11. CertificatesSection reset 후 재저장 integration

**보장할 동작**

- 새 자격증을 추가해 임시저장하면 `createCertifications`가 1회 호출된다.
- reset 이후 같은 값으로 다시 저장해도 중복 POST가 나가지 않는다.

**먼저 쓸 실패 테스트**

- 자격증 항목 추가, 필수값 입력, 임시저장 2회 흐름을 검증한다.

**구현 메모**

- 기존 배열 섹션과 입력 helper를 공유할 수 있으면 재사용하되 과한 추상화는 피한다.

**검증**

- `npm test -- submitTalentRegister.integration`

**완료 기준**: 자격증 배열의 reset 후 재저장 계약이 integration으로 고정된다.

**커밋**: `test: 자격증 임시저장 reset 후 중복 POST 방지 검증`

---

## T12. expTags dirtyFields 반복 PUT integration

**보장할 동작**

- 변경 없는 임시저장에서는 `updateExpTags`가 호출되지 않는다.
- `job.experiences`를 바꾼 뒤 임시저장하면 `updateExpTags`가 1회 호출된다.
- 성공 reset 이후에도 `keepDirty: true` 계약 때문에 반복 임시저장에서 다시 PUT이 나가는지 여부를 명시적으로 고정한다.

**먼저 쓸 실패 테스트**

- `job.experiences` 체크박스 입력을 가진 최소 UI를 렌더링한다.
- 변경 없음 / 변경 있음 / reset 후 재저장 3케이스를 테스트한다.

**구현 메모**

- 기존 jobs dirtyFields 테스트와 같은 하네스를 사용한다.
- 목적은 "현재 계약 문서화"이므로, 현 동작이 버그라면 테스트로 재현 후 최소 수정 여부를 판단한다.

**검증**

- `npm test -- submitTalentRegister.integration`
- 필요 시 `npm test -- submitTalentRegister`

**완료 기준**: expTags dirtyFields 반복 PUT 계약이 integration으로 고정된다.

**커밋**: `test: expTags dirtyFields 기반 저장 흐름 integration 검증`

---

## T13. 전체 검증 / PR 반영

**보장할 동작**

- 이번 후속 확장까지 포함한 테스트 묶음이 안정적으로 통과하고, PR 본문에 범위와 현재 계약이 반영된다.

**검증**

- `npm test -- submitTalentRegister.integration`
- `npm test -- submitTalentRegister`
- `npm run type-check`

**작업**

- 실패가 있으면 해당 task로 돌아가 수정한다.
- 새 draft PR 본문에 T8~T12 체크리스트와 `expTags` 반복 PUT 계약을 반영한다.
- CI green 이후 ready 전환 여부를 정리한다.

**완료 기준**: 후속 범위의 테스트/문서/PR 상태가 정리된다.

**커밋**: 코드 변경이 없으면 커밋 없음

## 체크리스트

- [x] plan 승인
- [x] task 작성
- [x] T8 완료
- [x] T9 완료
- [x] T10 완료
- [x] T11 완료
- [x] T12 완료
- [x] T13 검증 완료
