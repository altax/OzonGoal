import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

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

function pluralizeGoals(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  
  if (lastTwo >= 11 && lastTwo <= 19) {
    return "целей";
  }
  if (lastOne === 1) {
    return "цель";
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return "цели";
  }
  return "целей";
}

type CurrentShift = {
  scheduledEnd: Date;
  shiftType: string;
};

export type TabInfo = 
  | { type: "goals"; count: number; totalTarget: number; totalCurrent: number; averageEarningsPerShift?: number }
  | { type: "shifts"; past: number; scheduled: number; hasCurrent: boolean; currentShift?: CurrentShift | null }
  | { type: "default"; lastShiftIncome?: number };

interface BalanceHeaderProps {
  balance?: number;
  tabInfo?: TabInfo;
  onBalancePress?: () => void;
}

function getTimeRemaining(endDate: Date): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Смена завершается";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `До конца смены: ${hours} ч ${minutes} мин`;
  }
  return `До конца смены: ${minutes} мин`;
}

function pluralizeDays(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  
  if (lastTwo >= 11 && lastTwo <= 19) {
    return "смен";
  }
  if (lastOne === 1) {
    return "смена";
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return "смены";
  }
  return "смен";
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
              {tabInfo.count} {pluralizeGoals(tabInfo.count)} • {formatBalance(tabInfo.totalTarget)} ₽ • {percentage}%
            </ThemedText>
          </View>
        );
      }
      case "shifts": {
        if (tabInfo.currentShift) {
          return (
            <View style={[styles.infoTag, { backgroundColor: theme.successLight }]}>
              <ThemedText style={[styles.infoText, { color: theme.success }]}>
                {getTimeRemaining(tabInfo.currentShift.scheduledEnd)}
              </ThemedText>
            </View>
          );
        }
        return null;
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
  infoTagContainer: {
    alignItems: "center",
  },
  infoTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  infoText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
