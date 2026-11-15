/**
 * Which of several percentages is the highest. Returns one flag per value; every tied best is flagged.
 * Nothing is flagged with fewer than two values, or when all values look the same (compared as shown, whole percent).
 * Missing values (still loading) are skipped.
 */
export function bestFlags(values: (number | undefined)[]): boolean[] {
  const shown = values.map((v) => (v === undefined ? undefined : Math.round(v)));
  const have = shown.filter((v): v is number => v !== undefined);
  if (have.length < 2) return values.map(() => false);
  const top = Math.max(...have);
  if (have.every((v) => v === top)) return values.map(() => false);
  return shown.map((v) => v === top);
}
