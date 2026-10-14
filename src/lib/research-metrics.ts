export interface MetricSession {
  assigned_group: string;
  is_demo: boolean;
  decision_reached_at: string | null;
  next_module_started_at: string | null;
  meaningfulness: number | null;
  comprehension_score: number | null;
}
export function researchMetrics<T extends MetricSession>(rows: T[], includeDemo = false) {
  const sessions = includeDemo ? rows : rows.filter((s) => !s.is_demo);
  const group = (g: "A" | "B") => {
    const members = sessions.filter((s) => s.assigned_group === g);
    const eligible = members.filter((s) => s.decision_reached_at !== null);
    const continued = eligible.filter((s) => s.next_module_started_at !== null).length;
    return {
      started: members.length,
      eligible: eligible.length,
      continued,
      rate: eligible.length ? (continued / eligible.length) * 100 : null,
    };
  };
  const a = group("A"),
    b = group("B");
  return {
    sessions,
    a,
    b,
    difference: a.rate === null || b.rate === null ? null : b.rate - a.rate,
  };
}
export function safeCsv(value: unknown) {
  const text = String(value ?? "");
  // Spreadsheet apps can evaluate formulas after leading whitespace/control characters.
  const escaped = /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + escaped.replace(/"/g, '""') + '"';
}
