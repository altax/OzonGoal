import { Platform } from "react-native";

const tintColorLight = "#1A1A1A";
const tintColorDark = "#FFFFFF";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9E9E9E",
    tabIconSelected: tintColorLight,
    link: "#1A1A1A",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#FAFAFA",
    backgroundTertiary: "#F5F5F5",
    accent: "#1A1A1A",
    accentLight: "#F5F5F5",
    success: "#1A1A1A",
    successLight: "#F5F5F5",
    warning: "#1A1A1A",
    warningLight: "#F5F5F5",
    error: "#1A1A1A",
    errorLight: "#F5F5F5",
    income: "#1A1A1A",
    expense: "#1A1A1A",
    border: "#E8E8E8",
    cardShadow: "rgba(0, 0, 0, 0.05)",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#A0A0A0",
    buttonText: "#1A1A1A",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: tintColorDark,
    link: "#FFFFFF",
    backgroundRoot: "#0A0A0A",
    backgroundDefault: "#141414",
    backgroundSecondary: "#1F1F1F",
    backgroundTertiary: "#2A2A2A",
    accent: "#FFFFFF",
    accentLight: "#1F1F1F",
    success: "#FFFFFF",
    successLight: "#1F1F1F",
    warning: "#FFFFFF",
    warningLight: "#1F1F1F",
    error: "#FFFFFF",
    errorLight: "#1F1F1F",
    income: "#FFFFFF",
    expense: "#FFFFFF",
    border: "#2A2A2A",
    cardShadow: "rgba(0, 0, 0, 0.3)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 44,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  fab: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  tabBar: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
};
