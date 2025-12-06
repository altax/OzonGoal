import { Platform } from "react-native";

const tintColorLight = "#D4A574";
const tintColorDark = "#E8C4A0";

export const Colors = {
  light: {
    text: "#4A4035",
    textSecondary: "#8B7355",
    buttonText: "#FFFFFF",
    tabIconDefault: "#B8A082",
    tabIconSelected: tintColorLight,
    link: "#D4A574",
    backgroundRoot: "#FDF8F3",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#FAF5EF",
    backgroundTertiary: "#F5EDE3",
    accent: "#D4A574",
    accentLight: "#FDF5ED",
    success: "#7CB87C",
    successLight: "#F0F8F0",
    warning: "#E5B87C",
    warningLight: "#FDF8F0",
    error: "#D98B8B",
    errorLight: "#FDF0F0",
    income: "#7CB87C",
    expense: "#D98B8B",
    border: "#EDE5DB",
    cardShadow: "rgba(139, 115, 85, 0.08)",
  },
  dark: {
    text: "#F5EDE3",
    textSecondary: "#C4B59A",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8B7355",
    tabIconSelected: tintColorDark,
    link: "#E8C4A0",
    backgroundRoot: "#2C2419",
    backgroundDefault: "#3D3227",
    backgroundSecondary: "#4A3D30",
    backgroundTertiary: "#574839",
    accent: "#E8C4A0",
    accentLight: "#3D3227",
    success: "#8DC88D",
    successLight: "#2D3D2D",
    warning: "#E8C490",
    warningLight: "#3D3525",
    error: "#E89B9B",
    errorLight: "#3D2525",
    income: "#8DC88D",
    expense: "#E89B9B",
    border: "#4A3D30",
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
  buttonHeight: 52,
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
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fab: {
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  tabBar: {
    shadowColor: "#8B7355",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
};
