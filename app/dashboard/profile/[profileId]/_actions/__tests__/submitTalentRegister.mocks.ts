import { vi } from "vitest";

// 도메인 API 전부 모킹 (실제 네트워크 호출 차단)
vi.mock("@/lib/api/profiles", () => ({
  updateProfile: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/educations", () => ({
  createEducations: vi.fn().mockResolvedValue([]),
  updateEducation: vi.fn().mockResolvedValue({}),
  deleteEducation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/api/experiences", () => ({
  createExperiences: vi.fn().mockResolvedValue([]),
  updateExperience: vi.fn().mockResolvedValue({}),
  deleteExperience: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/api/languages", () => ({
  createLanguages: vi.fn().mockResolvedValue([]),
  updateLanguage: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/certifications", () => ({
  createCertifications: vi.fn().mockResolvedValue([]),
  updateCertification: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/awards", () => ({
  createAwards: vi.fn().mockResolvedValue([]),
  updateAward: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/expTags", () => ({
  updateExpTags: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/jobs", () => ({
  updateJobs: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/customSkills", () => ({
  updateCustomSkills: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/profileThumbnail", () => ({
  presignThumbnail: vi.fn().mockResolvedValue({ uploadUrl: "u", objectKey: "o", fileUrl: "f" }),
  uploadThumbnailToS3: vi.fn().mockResolvedValue(undefined),
  completeThumbnailUpload: vi.fn().mockResolvedValue({}),
  upsertThumbnailLink: vi.fn().mockResolvedValue({}),
  upsertProfileLink: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/api/profilePortfolio", () => ({
  presignPortfolio: vi.fn().mockResolvedValue({ uploadUrl: "u", objectKey: "o", fileUrl: "f" }),
  uploadPortfolioToS3: vi.fn().mockResolvedValue(undefined),
  completePortfolioUpload: vi.fn().mockResolvedValue({
    fileUrl: "f",
    originalFilename: "p.pdf",
    contentType: "application/pdf",
    fileSize: 100,
  }),
}));
vi.mock("@/lib/api/workDriven", () => ({
  submitWorkDrivenTest: vi.fn().mockResolvedValue({}),
}));
