import { describe, it, expect } from "vitest";
import { researchMetrics, safeCsv } from "@/lib/research-metrics";
import { activityInput, interactionInput } from "@/lib/experiment-validation";
import { validatePhotoFile } from "@/lib/photo";
import { decodePhoto } from "@/lib/photo.server";
const ref = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  token: "22222222-2222-4222-8222-222222222222",
};
describe("Experiment inputs and metrics", () => {
  it("uses actual starts and decision denominators, excluding demonstrations", () => {
    const rows = [
      {
        assigned_group: "A",
        is_demo: false,
        decision_reached_at: "t",
        next_module_started_at: "t",
        meaningfulness: 4,
        comprehension_score: 3,
      },
      {
        assigned_group: "A",
        is_demo: false,
        decision_reached_at: "t",
        next_module_started_at: null,
        meaningfulness: 2,
        comprehension_score: 2,
      },
      {
        assigned_group: "A",
        is_demo: false,
        decision_reached_at: null,
        next_module_started_at: null,
        meaningfulness: null,
        comprehension_score: null,
      },
      {
        assigned_group: "B",
        is_demo: false,
        decision_reached_at: "t",
        next_module_started_at: "t",
        meaningfulness: 5,
        comprehension_score: 3,
      },
      {
        assigned_group: "A",
        is_demo: true,
        decision_reached_at: "t",
        next_module_started_at: "t",
        meaningfulness: 5,
        comprehension_score: 3,
      },
    ];
    const m = researchMetrics(rows);
    expect(m.a).toEqual({ started: 3, eligible: 2, continued: 1, rate: 50 });
    expect(m.b.rate).toBe(100);
    expect(m.difference).toBe(50);
    expect(researchMetrics([]).difference).toBeNull();
    expect(researchMetrics(rows, true).a.started).toBe(4);
  });
  it("rejects missing sorting answers and empty observations", () => {
    expect(() => interactionInput.parse({ ...ref, answers: { bottle: "recycle" } })).toThrow();
    expect(() =>
      activityInput.parse({ ...ref, status: "completed", observationText: "  " }),
    ).toThrow();
    expect(
      activityInput.parse({ ...ref, status: "completed", observationText: "I reused a clean pot." })
        .photoDataUrl,
    ).toBeUndefined();
  });
  it("rejects unsupported and oversized photos and fake JPEGs", () => {
    expect(() => validatePhotoFile({ type: "image/svg+xml", size: 100 })).toThrow();
    expect(() => validatePhotoFile({ type: "image/jpeg", size: 16 * 1024 * 1024 })).toThrow();
    expect(() => decodePhoto("data:image/jpeg;base64,SGVsbG8=")).toThrow();
    expect(() => decodePhoto("data:image/png;base64,AAAA")).toThrow();
  });
  it("escapes formulas including leading whitespace in CSV observations", () => {
    expect(safeCsv('hello,"ocean"')).toBe('"hello,""ocean"""');
    expect(safeCsv(" \t=1+1")).toBe('"\' \t=1+1"');
    expect(safeCsv("@SUM(1)")).toBe('"\'@SUM(1)"');
  });
});
