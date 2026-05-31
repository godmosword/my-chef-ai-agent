export function confidenceLabel(confidence: number): "高信心" | "中信心" | "低信心" {
  if (confidence >= 0.8) return "高信心";
  if (confidence >= 0.5) return "中信心";
  return "低信心";
}
