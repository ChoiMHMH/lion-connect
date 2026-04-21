# 이슈 → 브랜치 → PR 워크플로우

## 단계 1. 계획 1단계 합의 직후 — 이슈 생성

```bash
gh issue create \
  --title "<한 줄 요약>" \
  --body "$(cat <<'EOF'
## 배경
<plan.md Why 요약>

## 계획
<plan.md 해결책 bullet>

## 완료 기준
<DoD>
EOF
)"
```

## 단계 2. 이슈 번호 수령 직후 — 브랜치 생성

```bash
git checkout -b <type>/<issue-num>-<kebab-slug>
```

type: `feat` | `refactor` | `test` | `docs` | `chore`

## 단계 3. 첫 커밋 push 직후 — Draft PR 생성

```bash
gh pr create --draft \
  --title "<type>: <한 줄 요약> (#<issue-num>)" \
  --body "$(cat <<'EOF'
Closes #<issue-num>

## 작업 범위
<task 체크리스트 — task.md 기반>
- [ ] task 1
- [ ] task 2

## 테스트
<추가/수정된 테스트>

## 수치 변화 (해당 시)
| 항목 | before | after |
|---|---|---|

## 리스크·롤백
<리스크 1–2줄 + 롤백 방법>
EOF
)"
```

## 단계 4. task 완료마다 — 본문 체크박스 업데이트

```bash
gh pr edit <pr-num> --body "<updated>"
```

## 단계 5. 모든 task 완료 + CI 녹색 — Ready 해제

```bash
gh pr ready <pr-num>
```

## 단위 규칙

- 1 이슈 = 1 PR = N task 커밋
- Phase 하나 = 이슈 1개 (예: "Phase 2: 테스트 + CI")
- 방향 틀어지면 `gh pr close` + 브랜치 삭제, 재시도

## 금지

- PR 을 ready 상태로 바로 만들기 (반드시 `--draft` 로 시작)
- 이슈 없이 PR 생성
- main 브랜치에서 직접 작업
