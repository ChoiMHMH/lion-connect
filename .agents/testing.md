# TDD 규칙

## 매 task 시작 시 순서

1. 이 task에서 **보장할 동작**을 1–2줄로 명시
2. 실패하는 테스트부터 작성
3. `npm test` 실행 → red 확인 (사용자에게 출력 공유)
4. 최소 구현으로 green
5. 리팩토링 (green 유지 확인)
6. 커밋

## 엣지 케이스 체크리스트

- [ ] 정상 경로
- [ ] 에러 경로 (네트워크 실패 / 검증 실패)
- [ ] 경계값 (빈 배열 / null / undefined / 동시 호출)

## 커버리지 정책

- 숫자 목표 없음
- 새 코드는 테스트 필수
- 기존 코드는 건드릴 때만 테스트 추가
- CI 에서 커버리지 **하락** 차단 (상승은 의무 아님)

## 테스트 프레임워크

- Vitest + @testing-library (Phase 2 도입 예정)
- fetch 모킹: `vi.spyOn(global, 'fetch')`
- 파일 위치: `<source-path>/__tests__/<name>.test.ts`

## 실행 명령

- 전체: `npm test`
- 파일 단위: `npm test -- <path-pattern>`
- 커버리지: `npm run test:coverage`

## 테스트 함정 (경험 누적)

> 실제로 겪은 문제만 기록. 카테고리(fetch / zustand / RHF 등)가 분화되면 별도 파일로 분리.

- **URL substring 매칭은 경계 명시**: `url.includes("/a")` 는 `"/api/a"`, `"/api/b"` 에 모두 걸린다 (base URL `/api` 안에 `/a` 포함). 고유 경로명(`/route-a`) · `endsWith` · 정규식 경계 중 택일.
