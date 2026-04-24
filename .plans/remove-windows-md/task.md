# windows.md 제거 — Task 분할

> plan: [plan.md](./plan.md)
> 이슈: `TBD` `docs: windows.md 제거`
> 대상 브랜치: `TBD` `docs/<issue-num>-remove-windows-md`
> 원칙: task 1개 = 커밋 1개. 작은 문서 정리이지만, AGENTS 진입점과 실제 파일 삭제가 함께 일어나므로 한 커밋으로 묶는다.

## 본 작업의 스코프

- **포함**: `AGENTS.md`의 `.agents/windows.md` 참조 제거, `.agents/windows.md` 파일 삭제
- **제외**: 다른 `.agents` 문서 개편, UTF-8 관련 새 규칙 추가, 현재 진행 중인 integration 테스트 코드 수정
- **주의**: 현재 작업트리에 다른 변경이 존재할 수 있으므로, 이번 커밋은 문서 2곳만 정확히 포함한다.

## T1 — windows.md 참조 제거 + 파일 삭제

**보장할 동작**: AGENTS 진입점에서 `windows.md`를 더 이상 참조하지 않고, `.agents/windows.md` 파일도 저장소에서 제거된다.

**먼저 할 확인**

- `AGENTS.md`에서 `.agents/windows.md` 참조가 1곳인지 확인
- `.agents/windows.md`가 다른 곳에서 추가로 참조되지 않는지 확인
- 현재 작업트리의 비관련 변경 파일을 건드리지 않도록 범위를 고정

**작업**

- `AGENTS.md`의 환경별 참고 문서 섹션에서 `.agents/windows.md` 항목 제거
- `.agents/windows.md` 파일 삭제
- `.agents` 디렉터리 나머지 문서 구조는 유지

**검증**

- `rg -n "windows\\.md|window\\.md" AGENTS.md .agents .plans -S`
- `git diff -- AGENTS.md .agents/windows.md`

**완료 기준**: `AGENTS.md`와 `.agents/windows.md`만 변경 대상으로 잡히고, windows 문서 참조가 남지 않는다.

**커밋**: `docs: windows PowerShell UTF-8 참고 문서 제거`

## 하네스 체크리스트

- [x] plan 승인
- [ ] task 승인
- [ ] 필요 시 issue 생성
- [ ] 필요 시 branch 생성
- [ ] T1 완료
- [ ] 커밋

## 승인 후 첫 작업

사용자가 이 task 분할에 "좋아"라고 승인하면 `AGENTS.md` 참조 제거와 `.agents/windows.md` 삭제를 바로 수행한다. 구현 후에는 참조 검색과 diff 범위를 확인해 이번 문서 정리가 다른 작업 파일과 섞이지 않았는지 검증한다.
