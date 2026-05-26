export type GenerationErrorKind =
  | "network"
  | "timeout"
  | "input_short"
  | "content_blocked"
  | "quota"
  | "unknown";

export type GenerationErrorView = {
  kind: GenerationErrorKind;
  message: string;
  /** Show retry button */
  retry: boolean;
  /** Focus hero textarea after render */
  focusInput: boolean;
  /** Show「重新輸入」instead of retry */
  clearInput: boolean;
};
