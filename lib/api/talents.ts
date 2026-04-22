// lib/api/talents.ts

import { get } from "@/lib/apiClient";
import { API_ENDPOINTS } from "@/constants/api";

// 🔹 education 객체 타입 분리
export type TalentEducation = {
  schoolName: string;
  major: string;
};

// ───────────────── DTO 타입들 ─────────────────

export type TalentListItem = {
  workDrivenLevel: number | null;
  id: number;
  name: string;
  introduction: string;
  email: string | null;
  phoneNumber: string | null;
  experiences: string[];
  tendencies: string[];
  education: TalentEducation | null; // ← 응답 예시 기준
  jobRoles: string[];
  skills: string[];
  thumbnailUrl: string | null;
};

export type TalentListResponse = {
  totalElements: number;
  totalPages: number;
  size: number;
  content: TalentListItem[];
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  last: boolean;
  numberOfElements: number;
  pageable: {
    offset: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    pageNumber: number;
    pageSize: number;
    paged: boolean;
    unpaged: boolean;
  };
  empty: boolean;
};

/**
 * 인재 검색 파라미터
 */
export type FetchTalentsParams = {
  page?: number;
  size?: number;
  jobGroupId?: number;
  jobRoleId?: number;
  keyword?: string; // 검색 키워드
};

/**
 * 인재 검색 API
 * GET /profiles/search?jobGroupId={jobGroupId}&jobRoleId={jobRoleId}&keyword={keyword}&page={page}&size={size}
 */
export async function fetchTalents({
  page = 0,
  size = 20,
  jobGroupId,
  jobRoleId,
  keyword,
}: FetchTalentsParams = {}): Promise<TalentListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("size", String(size));

  if (jobGroupId !== undefined) {
    params.set("jobGroupId", String(jobGroupId));
  }
  if (jobRoleId !== undefined) {
    params.set("jobRoleId", String(jobRoleId));
  }
  if (keyword && keyword.trim()) {
    params.set("keyword", keyword.trim());
  }

  const url = `${API_ENDPOINTS.TALENTS.SEARCH}?${params.toString()}`;

  return get<TalentListResponse>(url, {
    credentials: "include", // 쿠키 포함
  });
}
