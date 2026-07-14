/** Shared site design tokens — black & white theme */
export const theme = {
  black: "#000000",
  white: "#ffffff",
  gray50: "#fafafa",
  gray100: "#f4f4f5",
  gray200: "#e4e4e7",
  gray300: "#d4d4d8",
  gray400: "#a1a1aa",
  gray500: "#71717a",
  gray600: "#52525b",
  gray700: "#3f3f46",
  gray800: "#27272a",
  gray900: "#18181b",
  shadow: "0 20px 60px rgba(0,0,0,0.1)",
  shadowSoft: "0 4px 20px rgba(0,0,0,0.05)",
  radius: "20px",
  radiusSm: "12px",
  radiusPill: "999px",
  container: "1200px",
  fontSans: "var(--font-manrope), 'Manrope', sans-serif",
  fontScript: "var(--font-great-vibes), 'Great Vibes', cursive",
} as const;

export type Theme = typeof theme;
