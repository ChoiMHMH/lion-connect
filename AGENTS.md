# AGENTS.md

이 레포에서 AI 에이전트(Claude Code, Codex 등)가 작업할 때 반드시 읽는 공용 진입점.

## 작업 유형별 상세 문서

- 계획 수립: `.agents/planning.md`
- 테스트 작성: `.agents/testing.md`
- 이슈/브랜치/PR: `.agents/workflow.md`
- 커밋 규칙: `.agents/commit.md`
- 프로젝트 컨벤션: `.agents/conventions.md`

## 절대 금지

- `main` 브랜치 직접 커밋·push
- 계획 1단계(plan.md) 합의 전 파일 수정
- 계획 2단계(task 분할) 합의 전 구현 착수
- 테스트 없이 새 기능·리팩토링 착수
- `--no-verify` 로 훅 우회

## 기본 작업 흐름

1. 요청 수신 → `.agents/planning.md` 의 1단계 프로토콜 수행
2. 사용자 승인 → `.agents/workflow.md` 로 이슈·브랜치·draft PR 생성
3. 2단계 task 분할 → 사용자 승인
4. task 1개 = 커밋 1개 (TDD: 실패 테스트 → green → refactor)
5. 모든 task 완료 + CI 녹색 → `gh pr ready`
6. 사용자가 머지

## codex / claude 역할 구분

- 대규모 진단·복잡 로직 재설계: Codex 우선 고려
- 일상 편집·읽기·소규모 수정: Claude 기본
- 자동 라우팅 없음. 필요 시 사용자가 판단
