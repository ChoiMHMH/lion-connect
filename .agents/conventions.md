# 프로젝트 컨벤션 (lion-connect)

## 스택

Next.js 15 App Router / React 19 / TypeScript 5 / TanStack Query 5 / Zustand 5 / React Hook Form 7 + Zod 4 / Tailwind CSS 4

## API 3계층

- `constants/api.ts` — 엔드포인트 상수
- `lib/apiClient.ts` — fetch wrapper + 토큰 갱신
- `lib/api/*.ts` — 도메인별 API 함수

## 인증

- `accessToken`: 메모리
- `refreshToken`: HttpOnly 쿠키
- `refreshPromise` 모듈 스코프 캐싱으로 동시 401 → refresh 1회
- `_isRetry` 플래그로 재시도 중복 차단

## 폼

- React Hook Form + Zod
- `dirtyFields` + `defaultValues` 비교로 POST/PUT 자동 분기
- 파일 업로드: presign → S3 PUT → complete → link upsert (순차)
- 14섹션 제출: 파일 업로드(순차) → 섹션 CRUD(병렬) → 상태 전환(마지막)

## 권한

`middleware.ts` 의 `PROTECTED_ROUTES` 선언적 관리 (RBAC)

## 테스트

- Vitest + @testing-library (Phase 2 도입 예정)
- fetch mocking: `vi.spyOn(global, 'fetch')`
- 파일 위치: 대상 파일 옆 `__tests__/<name>.test.ts`

## 스타일

- ESLint (`npm run lint`), Prettier (`npm run format`)
- TypeScript strict (`npm run type-check`)
- `lint-staged` 가 pre-commit 에서 자동 실행

## 경로 별칭

- `@/*` → 프로젝트 루트 기준 (tsconfig.json paths)

## 금지 패턴

- `localStorage` 에 토큰 저장
- `any` 타입 (명시적 이유 없이)
- 페이지별 권한 가드 HOC 중복 (middleware 로 통합)
- `axios` 추가 (fetch wrapper 로 통일)
