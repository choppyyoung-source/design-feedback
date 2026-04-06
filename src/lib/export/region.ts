/**
 * Convert percentage coordinates to a human-readable region label.
 * Uses a 3x3 grid: top/middle/bottom x left/center/right
 */
export function getRegion(xPct: number, yPct: number): string {
  const row = yPct < 33 ? "top" : yPct < 66 ? "middle" : "bottom";
  const col = xPct < 33 ? "left" : xPct < 66 ? "center" : "right";

  if (row === "middle" && col === "center") return "center";
  return `${row}-${col}`;
}

export function getRegionKo(xPct: number, yPct: number): string {
  const row = yPct < 33 ? "상단" : yPct < 66 ? "중앙" : "하단";
  const col = xPct < 33 ? "좌측" : xPct < 66 ? "중앙" : "우측";

  if (row === "중앙" && col === "중앙") return "중앙";
  return `${row} ${col}`;
}
