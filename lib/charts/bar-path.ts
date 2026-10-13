/** A column with a rounded data end (top) and a square baseline (bottom). */
export function roundedTopBarPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  const right = x + width;
  const bottom = y + height;
  if (r === 0) {
    return `M${x},${y}H${right}V${bottom}H${x}Z`;
  }
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${right - r}Q${right},${y} ${right},${y + r}V${bottom}Z`;
}
