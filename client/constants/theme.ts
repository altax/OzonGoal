import { Platform } from "react-native";

const tintColorLight = "#1A1A1A";
const tintColorDark = "#FFFFFF";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B7280",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorLight,
    link: "#1A1A1A",
    backgroundRoot: "#FAFAFA",
    backgroundDefault: "#FAFAFA",
    backgroundSecondary: "#F3F4F6",
    backgroundTertiary: "#E5E7EB",
    backgroundContent: "#F0F1F3",
    accent: "#1A1A1A",
    accentLight: "#F3F4F6",
    success: "#10B981",
    successLight: "#D1FAE5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    income: "#10B981",
    expense: "#EF4444",
    border: "#E5E7EB",
    cardShadow: "rgba(0, 0, 0, 0.02)",
    tabBackground: "#FFFFFF",
    tabActiveBackground: "#1A1A1A",
    tabActiveText: "#FFFFFF",
    tabInactiveText: "#6B7280",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    buttonText: "#1A1A1A",
    tabIconDefault: "#6B6B6B",
    tabIconSelected: tintColorDark,
    link: "#FFFFFF",
    backgroundRoot: "#0A0A0A",
    backgroundDefault: "#111111",
    backgroundSecondary: "#1A1A1A",
    backgroundTertiary: "#252525",
    backgroundContent: "#151515",
    accent: "#FFFFFF",
    accentLight: "#1F1F1F",
    success: "#34D399",
    successLight: "#064E3B",
    warning: "#FBBF24",
    warningLight: "#78350F",
    error: "#F87171",
    errorLight: "#7F1D1D",
    income: "#34D399",
    expense: "#F87171",
    border: "#2A2A2A",
    cardShadow: "rgba(0, 0, 0, 0.3)",
    tabBackground: "#1A1A1A",
    tabActiveBackground: "#FFFFFF",
    tabActiveText: "#1A1A1A",
    tabInactiveText: "#9CA3AF",
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
    fontSize: 13,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  fab: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBar: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};
