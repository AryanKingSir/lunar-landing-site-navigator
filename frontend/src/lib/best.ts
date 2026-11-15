/**
 * Which of several percentages is the highest. Returns one flag per value; every tied best is flagged.
 * Nothing is flagged with fewer than two values, or when all values look the same (compared as shown, whole percent).
 * Missing values (still loading) are skipped.
 */
export function bestFlags(values: (number | undefined)[]): boolean[] {
  // bucket exactly as pct() displays: 0, "<1%", whole numbers, ">99%", 100
  const bucket = (v: number) => (v <= 0 ? 0 : v < 1 ? 0.5 : v >= 100 ? 100 : v > 99 ? 99.5 : Math.round(v));
  const shown = values.map((v) => (v === undefined ? undefined : bucket(v)));
  const have = shown.filter((v): v is number => v !== undefined);
  if (have.length < 2) return values.map(() => false);
  const top = Math.max(...have);
  if (have.every((v) => v === top)) return values.map(() => false);
  return shown.map((v) => v === top);
}
