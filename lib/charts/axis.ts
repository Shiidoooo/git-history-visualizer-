/** Picks evenly spaced indexes so axis labels never crowd each other. */
export function pickTickIndexes(count: number, maxTicks: number): number[] {
  if (count <= 0 || maxTicks <= 0) return [];
  const step = Math.ceil(count / maxTicks);
  const indexes: number[] = [];
  for (let index = 0; index < count; index += step) {
    indexes.push(index);
  }
  return indexes;
}

/** Keeps a label inside the plot: left-align near the left edge, right-align near the right. */
export function tickAnchor(position: number, plotWidth: number, edge = 24): "start" | "middle" | "end" {
  if (position < edge) return "start";
  if (position > plotWidth - edge) return "end";
  return "middle";
}
