import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

function getCurrentFullDate(): string {
  const days = [
    "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"
  ];
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  const now = new Date();
  const dayName = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

function formatBalance(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

export type TabInfo = 
  | { type: "goals"; count: number; totalTarget: number; totalCurrent: number }
  | { type: "shifts"; past: number; scheduled: number; hasCurrent: boolean }
  | { type: "default"; lastShiftIncome?: number };

interface BalanceHeaderProps {
  balance?: number;
  tabInfo?: TabInfo;
  onBalancePress?: () => void;
}

export function BalanceHeader({ balance = 0, tabInfo, onBalancePress }: BalanceHeaderProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  const renderTabInfo = () => {
    if (!tabInfo) return null;

    switch (tabInfo.type) {
      case "goals": {
        const percentage = tabInfo.totalTarget > 0 
          ? Math.round((tabInfo.totalCurrent / tabInfo.totalTarget) * 100) 
          : 0;
        return (
          <View style={[styles.infoTag, { backgroundColor: theme.accentLight }]}>
            <ThemedText style={[styles.infoText, { color: theme.accent }]}>
              {tabInfo.count} целей • {formatBalance(tabInfo.totalTarget)} ₽ • {percentage}%
            </ThemedText>
          </View>
        );
      }
      case "shifts": {
        const parts = [];
        if (tabInfo.past > 0) parts.push(`${tabInfo.past} отработано`);
        if (tabInfo.scheduled > 0) parts.push(`${tabInfo.scheduled} запланировано`);
        if (tabInfo.hasCurrent) parts.push("идет смена");
        
        if (parts.length === 0) return null;
        
        return (
          <View style={[styles.infoTag, { backgroundColor: theme.accentLight }]}>
            <ThemedText style={[styles.infoText, { color: theme.accent }]}>
              {parts.join(" • ")}
            </ThemedText>
          </View>
        );
      }
      case "default": {
        if (!tabInfo.lastShiftIncome || tabInfo.lastShiftIncome <= 0) return null;
        return (
          <View style={[styles.infoTag, { backgroundColor: theme.successLight }]}>
            <ThemedText style={[styles.infoText, { color: theme.success }]}>
              +{formatBalance(tabInfo.lastShiftIncome)} ₽ за последнюю смену
            </ThemedText>
          </View>
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <ThemedText type="caption" style={[styles.dateText, { color: theme.textSecondary }]}>
          {getCurrentFullDate()}
        </ThemedText>
        <View style={styles.topRowRight}>
          <Pressable
            style={({ pressed }) => [
              styles.themeToggle,
              { backgroundColor: theme.backgroundSecondary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={toggleTheme}
          >
            <Feather
              name={isDark ? "sun" : "moon"}
              size={18}
              color={theme.accent}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.avatar,
              { opacity: pressed ? 0.7 : 1 },
              Shadows.cardLight,
            ]}
            onPress={() => {}}
          >
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          </Pressable>
        </View>
      </View>

      <Pressable 
        style={({ pressed }) => [
          styles.balanceSection,
          pressed && onBalancePress && { opacity: 0.7 },
        ]}
        onPress={onBalancePress}
        disabled={!onBalancePress}
      >
        <ThemedText type="caption" style={[styles.balanceLabel, { color: theme.textSecondary }]}>
          БАЛАНС
        </ThemedText>
        <ThemedText type="h1" style={[styles.balanceAmount, { color: theme.text }]}>
          {formatBalance(balance)} ₽
        </ThemedText>
        {renderTabInfo()}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  topRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "500",
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
  },
  balanceSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  balanceLabel: {
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  balanceAmount: {
    fontSize: 44,
    fontWeight: "700",
    marginBottom: Spacing.md,
    letterSpacing: -1,
  },
  infoTag: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
