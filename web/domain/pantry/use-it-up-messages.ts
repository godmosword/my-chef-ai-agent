/** Text triggers for Use It Up mode (PT-4). */
export function isUseItUpMessage(text: string): boolean {
  return /用完它|清快過期|用快過期食材做菜/.test(text.trim());
}
