# Windows / PowerShell 환경

이 문서는 Windows PowerShell에서 한국어 파일, GitHub PR 본문, issue 본문을 읽거나 작성할 때만 참고한다.

이 레포의 문서와 PR/issue 본문은 UTF-8 한국어를 기준으로 한다. Windows PowerShell 기본 인코딩과 GitHub CLI 입력/출력 인코딩이 섞이면 한글이 깨질 수 있다.

## 언제 참고

- 작업 환경이 Windows PowerShell 이고 한국어 문서, PR 본문, issue 본문을 읽거나 작성하는 경우
- `gh pr view`, `gh pr edit`, `gh issue create`, `gh issue view` 등 GitHub CLI 로 한국어 본문을 다루는 경우

## 권장

- 한국어 문서를 읽을 때는 UTF-8 인코딩을 명시한다.
- GitHub PR/issue 본문처럼 긴 한국어 텍스트를 작성할 때는 UTF-8 파일을 만든 뒤 `--body-file` 로 전달한다.
- GitHub CLI 로 한국어 본문을 확인할 때도 UTF-8 출력 설정을 먼저 맞춘다.

## 참고 명령

한국어 문서 읽기:

```powershell
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Encoding utf8 -Path .agents\workflow.md
```

GitHub PR 본문 작성:

```powershell
$bodyPath = Join-Path $env:TEMP "pr-body.md"
[System.IO.File]::WriteAllText($bodyPath, $body, [System.Text.UTF8Encoding]::new($false))
gh pr edit 4 --body-file $bodyPath
Remove-Item -LiteralPath $bodyPath
```

GitHub PR 본문 확인:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
gh pr view 4 --json body --jq ".body"
```

## 피할 것

PowerShell pipe/herestring 으로 긴 한국어 본문을 GitHub CLI 에 직접 넘기지 않는다.

```powershell
@'
한국어 본문
'@ | gh pr edit 4 --body-file -
```

PowerShell 파이프 인코딩 때문에 GitHub 에 깨진 본문이 저장될 수 있다.
