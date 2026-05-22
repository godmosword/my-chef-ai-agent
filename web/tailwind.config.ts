import type { Config } from "tailwindcss";
import chefPreset from "@chef/design-tokens/tailwind-preset";

const config: Config = {
  presets: [chefPreset as unknown as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-background-default)",
        accent: {
          primary: "var(--color-brand-primary)",
          primaryMuted: "var(--color-brand-primaryLight)",
        },
        danger: "var(--color-cuisine-taiwanese)",
        warning: "var(--color-brand-primary)",
        muted: "var(--color-surface-muted)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Noto Sans TC", "sans-serif"],
        serif: ["var(--font-serif)", "Noto Serif TC", "serif"],
      },
      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "1.5" }],
        sm: ["var(--font-size-sm)", { lineHeight: "1.5" }],
        base: ["var(--font-size-base)", { lineHeight: "1.6" }],
        lg: ["var(--font-size-lg)", { lineHeight: "1.5" }],
        xl: ["var(--font-size-xl)", { lineHeight: "1.4" }],
        "2xl": ["var(--font-size-2xl)", { lineHeight: "1.3" }],
      },
      spacing: {
        "btn-sm": "var(--spacing-btn-sm)",
        "btn-md": "var(--spacing-btn-md)",
        "btn-lg": "var(--spacing-btn-lg)",
      },
      minHeight: {
        screen: "100dvh",
      },
      height: {
        screen: "100dvh",
      },
      boxShadow: {
        card: "var(--shadow-md)",
      },
      transitionDuration: {
        DEFAULT: "var(--motion-duration-normal)",
      },
      maxWidth: {
        content: "80rem",
      },
    },
  },
};

export default config;
