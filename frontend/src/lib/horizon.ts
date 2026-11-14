export function maskAt(el: number[], azDeg: number): number {
  const n = el.length;
  if (n === 0) return 0;
  const pos = (((azDeg % 360) + 360) % 360) / (360 / n);
  const i0 = Math.floor(pos) % n;
  const i1 = (i0 + 1) % n;
  const f = pos - Math.floor(pos);
  return el[i0] + (el[i1] - el[i0]) * f;
}
