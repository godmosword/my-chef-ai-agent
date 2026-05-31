/**
 * Mirror of @chef/design-tokens color values for contexts that cannot use CSS variables
 * (e.g. next/og ImageResponse, themeColor meta).
 * Keep in sync with packages/design-tokens/src/tokens.json light theme.
 */
export const tokenColors = {
  background: "#FFFAF5",
  backgroundAlt: "#F9F7F4",
  surface: "#FFFFFF",
  surfaceMuted: "#F9F4EE",
  border: "#EAE4DC",
  brandPrimary: "#C8922A",
  brandPrimaryDark: "#A67318",
  brandPrimaryLight: "#FDF6E7",
  brandGreen: "#2A6049",
  brandGreenText: "#F5F0E6",
  brandPurple: "#7B5EA7",
  textInk: "#1C1917",
  textBody: "#3D3530",
  textMuted: "#9C8F84",
  cuisineTaiwanese: "#6B3A2A",
  cuisineThai: "#2A5C3F",
  cuisineJapanese: "#3A2A4A",
  cuisineEuropean: "#2A3A4A",
} as const;
