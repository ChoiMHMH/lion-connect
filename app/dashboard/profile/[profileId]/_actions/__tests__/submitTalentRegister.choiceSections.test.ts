import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TalentRegisterFormValues } from "@/schemas/talent/talentRegisterSchema";
import { makeMethods, cloneDefaultValues } from "./submitTalentRegister.helpers";
import "./submitTalentRegister.mocks";

/**
 * 링크 섹션 분기 로직
 *
 * - url 이 있는 링크만 type 별 PUT upsert
 * - 빈 url 또는 type 없는 링크는 skip
 */
describe("submitTalentRegister — 링크 payload (T5 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildValues(links: TalentRegisterFormValues["links"]): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.links = links;
    return v;
  }

  it("URL 있는 링크만 upsertProfileLink PUT 호출하고 링크 payload 를 전송한다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const thumbnailApi = await import("@/lib/api/profileThumbnail");

    const values = buildValues([
      {
        type: "LINK",
        url: "https://github.com/example",
      },
      {
        type: "LINK2",
        url: "https://example.com/blog",
      },
      {
        type: "LINK3",
        url: "   ",
      },
      {
        url: "https://example.com/no-type",
      },
      {
        type: "LINK4",
        url: "",
      },
    ]);
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(thumbnailApi.upsertProfileLink).toHaveBeenCalledTimes(2);
    expect(thumbnailApi.upsertProfileLink).toHaveBeenNthCalledWith(
      1,
      1,
      "LINK",
      {
        type: "LINK",
        url: "https://github.com/example",
        originalFilename: "",
        contentType: "text/uri-list",
        fileSize: 0,
      },
      "PUT"
    );
    expect(thumbnailApi.upsertProfileLink).toHaveBeenNthCalledWith(
      2,
      1,
      "LINK2",
      {
        type: "LINK2",
        url: "https://example.com/blog",
        originalFilename: "",
        contentType: "text/uri-list",
        fileSize: 0,
      },
      "PUT"
    );
  });

  it("links 가 빈 배열이면 링크 저장 호출 0회", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const thumbnailApi = await import("@/lib/api/profileThumbnail");

    const values = buildValues([]);
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(thumbnailApi.upsertProfileLink).not.toHaveBeenCalled();
  });
});

/**
 * jobs 섹션 분기 로직
 *
 * - 최종 제출은 dirty 여부와 무관하게 유효 role ID PUT
 * - 임시 저장은 job category/role dirty 일 때만 PUT
 * - 알 수 없는 role code 는 skip
 */
describe("submitTalentRegister — jobs 분기 (T6 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildValues(role: string): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.job = {
      category: "development",
      role,
      experiences: [],
    };
    return v;
  }

  it("최종 제출은 dirty 여부와 무관하게 유효 role ID 를 PUT 한다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const jobsApi = await import("@/lib/api/jobs");

    const values = buildValues("frontend");
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: false });

    expect(jobsApi.updateJobs).toHaveBeenCalledTimes(1);
    expect(jobsApi.updateJobs).toHaveBeenCalledWith(1, { ids: [1] });
  });

  it("임시 저장은 job dirty 가 없으면 jobs PUT 을 호출하지 않는다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const jobsApi = await import("@/lib/api/jobs");

    const values = buildValues("frontend");
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(jobsApi.updateJobs).not.toHaveBeenCalled();
  });

  it("임시 저장에서 job.role 이 dirty 이면 유효 role ID 를 PUT 한다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const jobsApi = await import("@/lib/api/jobs");

    const values = buildValues("frontend");
    const methods = makeMethods({
      values,
      defaultValues: cloneDefaultValues(),
      dirtyFields: { job: { role: true } },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(jobsApi.updateJobs).toHaveBeenCalledTimes(1);
    expect(jobsApi.updateJobs).toHaveBeenCalledWith(1, { ids: [1] });
  });

  it("임시 저장에서 job.category 가 dirty 이면 유효 role ID 를 PUT 한다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const jobsApi = await import("@/lib/api/jobs");

    const values = buildValues("frontend");
    const methods = makeMethods({
      values,
      defaultValues: cloneDefaultValues(),
      dirtyFields: { job: { category: true } },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(jobsApi.updateJobs).toHaveBeenCalledTimes(1);
    expect(jobsApi.updateJobs).toHaveBeenCalledWith(1, { ids: [1] });
  });

  it("알 수 없는 role code 는 dirty/최종 제출이어도 jobs PUT 을 호출하지 않는다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const jobsApi = await import("@/lib/api/jobs");

    const values = buildValues("unknown-role");
    const methods = makeMethods({
      values,
      defaultValues: cloneDefaultValues(),
      dirtyFields: { job: { role: true } },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: false });

    expect(jobsApi.updateJobs).not.toHaveBeenCalled();
  });
});

/**
 * expTags 섹션 분기 로직
 *
 * - job.experiences 문자열 key 를 expTag ID 로 변환
 * - 알 수 없는 key 는 필터
 * - 임시 저장은 job.experiences dirty 일 때만 PUT
 */
describe("submitTalentRegister — expTags 분기 (T7 후속)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildValues(experiences: string[]): TalentRegisterFormValues {
    const v = cloneDefaultValues();
    v.job = {
      category: "",
      role: "",
      experiences,
    };
    return v;
  }

  it("최종 제출은 expTag key 배열을 ID 배열 payload 로 변환한다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const expTagsApi = await import("@/lib/api/expTags");

    const values = buildValues(["bootcamp", "major"]);
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: false });

    expect(expTagsApi.updateExpTags).toHaveBeenCalledTimes(1);
    expect(expTagsApi.updateExpTags).toHaveBeenCalledWith(1, { ids: [1, 4] });
  });

  it("임시 저장은 job.experiences dirty 가 없으면 expTags PUT 을 호출하지 않는다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const expTagsApi = await import("@/lib/api/expTags");

    const values = buildValues(["bootcamp", "major"]);
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(expTagsApi.updateExpTags).not.toHaveBeenCalled();
  });

  it("임시 저장에서 job.experiences 가 dirty 이면 expTag ID payload 를 PUT 한다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const expTagsApi = await import("@/lib/api/expTags");

    const values = buildValues(["bootcamp", "major"]);
    const methods = makeMethods({
      values,
      defaultValues: cloneDefaultValues(),
      dirtyFields: { job: { experiences: true } },
    });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: true });

    expect(expTagsApi.updateExpTags).toHaveBeenCalledTimes(1);
    expect(expTagsApi.updateExpTags).toHaveBeenCalledWith(1, { ids: [1, 4] });
  });

  it("알 수 없는 expTag key 는 필터하고 알려진 ID 만 보낸다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const expTagsApi = await import("@/lib/api/expTags");

    const values = buildValues(["bootcamp", "unknown"]);
    const methods = makeMethods({ values, defaultValues: cloneDefaultValues() });

    await submitTalentRegister({ values, methods, profileId: 1, isTempSave: false });

    expect(expTagsApi.updateExpTags).toHaveBeenCalledTimes(1);
    expect(expTagsApi.updateExpTags).toHaveBeenCalledWith(1, { ids: [1] });
  });

  it("experiences 가 빈 배열이거나 모두 unknown 이면 expTags PUT 을 호출하지 않는다", async () => {
    const { submitTalentRegister } = await import("../submitTalentRegister");
    const expTagsApi = await import("@/lib/api/expTags");

    const emptyValues = buildValues([]);
    await submitTalentRegister({
      values: emptyValues,
      methods: makeMethods({ values: emptyValues, defaultValues: cloneDefaultValues() }),
      profileId: 1,
      isTempSave: false,
    });

    const unknownValues = buildValues(["unknown"]);
    await submitTalentRegister({
      values: unknownValues,
      methods: makeMethods({ values: unknownValues, defaultValues: cloneDefaultValues() }),
      profileId: 1,
      isTempSave: false,
    });

    expect(expTagsApi.updateExpTags).not.toHaveBeenCalled();
  });
});
