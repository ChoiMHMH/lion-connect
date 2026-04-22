"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Pager from "@/components/Pager";
import TalentSearchHeader from "./_components/TalentSearchHeader";
import EmptyTalentState from "./_components/EmptyTalentState";
import IntroduceCard from "./[talentId]/_components/IntroduceCard";
import IntroduceCardSkeleton from "./_components/IntroduceCardSkeleton";
import { useTalents } from "@/hooks/company/useTalents";
import type { BadgeType } from "@/components/ui/badge";
import { JOB_ROLE_ID_BY_NAME, findJobGroupByJobName } from "@/constants/jobs";

/* ================================
 * 1. 경험 배지 매핑
 * ================================ */

const EXPERIENCE_BADGE_BY_NAME: Record<string, { label: string; type: BadgeType }> = {
  "부트캠프 경험자": { label: "부트캠프 경험자", type: "bootcamp" },
  "창업 경험자": { label: "창업 경험자", type: "startup" },
  "자격증 보유자": { label: "자격증 보유자", type: "certified" },
  전공자: { label: "전공자", type: "major" },
};

export function mapExperiencesToBadges(
  experiences?: string[]
): { label: string; type: BadgeType }[] {
  if (!experiences || experiences.length === 0) return [];

  return experiences
    .map((name) => EXPERIENCE_BADGE_BY_NAME[name])
    .filter((b): b is { label: string; type: BadgeType } => !!b);
}

/* ================================
 * 2. 직무/직군 헬퍼
 * ================================ */

/** 역할 ID -> 직무명 역매핑 */
const JOB_NAME_BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(JOB_ROLE_ID_BY_NAME).map(([name, id]) => [id, name])
) as Record<number, string>;

/* ================================
 * 3. 카드용 타입
 * ================================ */

type TalentCardItem = {
  talentId: string;
  id: number;
  name: string;
  viewCount: number;
  university?: string | null;
  major?: string | null;
  jobGroup?: string | null;
  job?: string | null;
  badges?: { label: string; type: BadgeType }[];
  tendencies: string[];
  skills: string[];
  summary: string;
  /** 🔥 카드에서도 썸네일 보관 */
  thumbnailUrl?: string | null;
  /** Work Driven Level (1-5) */
  workDrivenLevel?: number;
  email?: string | null;
  phoneNumber?: string | null;
};

/* ================================
 * 4. 페이지 컴포넌트
 * ================================ */

function TalentsPageContent() {
  const searchParams = useSearchParams();

  const currentPage = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
  const backendPage = currentPage - 1;

  // URL에서 필터 파라미터 가져오기
  const jobGroupId = searchParams.get("jobGroupId")
    ? Number(searchParams.get("jobGroupId"))
    : undefined;
  const jobRoleId = searchParams.get("jobRoleId")
    ? Number(searchParams.get("jobRoleId"))
    : undefined;
  const keyword = searchParams.get("keyword")?.trim() || undefined;

  // React Query로 데이터 가져오기
  const { data, isLoading, error } = useTalents({
    page: backendPage,
    size: 20,
    jobGroupId,
    jobRoleId,
    keyword,
  });

  // 로딩 중이거나 데이터가 아직 없는 경우 스켈레톤 표시
  if (isLoading || !data) {
    return (
      <main className="w-full text-black mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <section className="mb-8 space-y-4">
            <TalentSearchHeader totalCount={0} />
            <div className="mt-6 flex flex-col gap-12">
              {Array.from({ length: 3 }).map((_, index) => (
                <IntroduceCardSkeleton key={index} />
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <main className="w-full text-black mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-lg text-red-500">인재 목록을 불러오는 데 실패했습니다.</div>
          </div>
        </div>
      </main>
    );
  }

  const apiTalents: TalentCardItem[] = data.content.map((t) => {
    const universityRaw = t.education?.schoolName ?? null;
    const majorRaw = t.education?.major ?? null;

    // ---------------------------
    // 직무/직군 변환 로직
    // ---------------------------
    const rawJobRoles = t.jobRoles ?? [];

    let jobName: string | null = null;
    let jobGroup: string | null = null;

    if (Array.isArray(rawJobRoles) && rawJobRoles.length > 0) {
      const lastRole = rawJobRoles[rawJobRoles.length - 1];

      if (typeof lastRole === "number") {
        jobName = JOB_NAME_BY_ID[lastRole] ?? null;
      } else if (typeof lastRole === "string") {
        jobName = lastRole;
      }

      if (jobName) {
        const group = findJobGroupByJobName(jobName);
        jobGroup = group || null;
      }
    }

    return {
      talentId: String(t.id),
      id: t.id,
      name: t.name,
      viewCount: 0, // TODO: 조회수 붙이면 교체
      university: universityRaw,
      major: majorRaw,
      jobGroup,
      job: jobName,
      badges: mapExperiencesToBadges(t.experiences ?? undefined),
      tendencies: t.tendencies ?? [],
      skills: t.skills ?? [],
      summary: t.introduction,
      /** 🔥 썸네일 URL 그대로 보관 (없으면 null) */
      thumbnailUrl: t.thumbnailUrl ?? null,
      /** Work Driven Level */
      workDrivenLevel: t.workDrivenLevel ?? undefined,
      email: t.email ?? null,
      phoneNumber: t.phoneNumber ?? null,
    };
  });

  // 서버에서 필터링된 데이터 사용
  const totalCount = data.totalElements ?? 0;
  const totalPages = data.totalPages ?? 1;

  // 필터 적용 여부 확인
  const hasFilters = !!(jobGroupId || jobRoleId || keyword);

  return (
    <main className="w-full text-black mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="mb-8 space-y-4">
          {/* 서버에서 필터링된 총 개수 */}
          <TalentSearchHeader totalCount={totalCount} />

          {apiTalents.length === 0 ? (
            <EmptyTalentState hasFilters={hasFilters} />
          ) : (
            <div className="mt-6 flex flex-col gap-12">
              {apiTalents.map((t, index) => (
                <IntroduceCard
                  key={`${t.talentId}-${index}`}
                  talentId={t.talentId}
                  name={t.name}
                  viewCount={t.viewCount}
                  badges={t.badges}
                  tendencies={t.tendencies}
                  university={t.university ?? undefined}
                  major={t.major ?? undefined}
                  jobGroup={t.jobGroup ?? undefined}
                  job={t.job ?? undefined}
                  skills={t.skills}
                  /** 🔥 여기서 프로필 이미지로 썸네일 전달 */
                  thumbnailUrl={t.thumbnailUrl ?? "/images/default-profile.png"}
                  workDrivenLevel={t.workDrivenLevel}
                  email={t.email ?? undefined}
                  phoneNumber={t.phoneNumber ?? undefined}
                  showContacts={true}
                  showDetailButton={true}
                  className="
                    w-full
                    transition-shadow
                    hover:shadow-[0_4px_6px_-2px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.10)]
                    hover:border-border-secondary
                  "
                  summary={t.summary}
                />
              ))}
            </div>
          )}
        </section>

        {apiTalents.length > 0 && (
          <Pager currentPage={currentPage} totalPages={totalPages} className="mt-10 mb-20" />
        )}
      </div>
    </main>
  );
}

/**
 * 인재탐색 페이지
 * - 권한 체크: 미들웨어에서 처리 (ADMIN, COMPANY, JOINEDCOMPANY만 접근 가능)
 * - middleware.ts의 PROTECTED_ROUTES 참조
 */
export default function TalentsPage() {
  return (
    <Suspense>
      <TalentsPageContent />
    </Suspense>
  );
}
