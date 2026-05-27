/**
 * System-prompt block for 清冰箱 mode (PT-3).
 */
export function buildCleanFridgeSystemBlock(ingredientLines: string[]): string {
  if (!ingredientLines.length) return "";
  const list = ingredientLines.join("、");
  return `※ 使用者要求清冰箱模式：
請優先使用以下使用者已擁有的食材生成食譜：${list}
若這些食材無法成菜，可少量補充常見家庭調味料／配料，並在 shopping_list 明確列出需新增的項目。`;
}
