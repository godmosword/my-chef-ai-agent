/** Detect 清冰箱-style user messages (PT-3). */
export function isCleanFridgeMessage(text: string): boolean {
  return /清冰箱|冰箱剩|剩食|冰箱有什麼|用冰箱/.test(text);
}
