import { Colors } from "@/constants/theme";

export function useTheme() {
  const theme = Colors.light;

  return {
    theme,
    isDark: false,
  };
}
