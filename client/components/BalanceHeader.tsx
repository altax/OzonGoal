import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";

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

interface BalanceHeaderProps {
  balance?: number;
  lastShiftIncome?: number;
}

export function BalanceHeader({ balance = 0, lastShiftIncome = 0 }: BalanceHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <ThemedText type="caption" style={[styles.dateText, { color: theme.textSecondary }]}>
          {getCurrentFullDate()}
        </ThemedText>
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

      <View style={styles.balanceSection}>
        <ThemedText type="caption" style={[styles.balanceLabel, { color: theme.textSecondary }]}>
          БАЛАНС
        </ThemedText>
        <ThemedText type="h1" style={[styles.balanceAmount, { color: theme.text }]}>
          {formatBalance(balance)} ₽
        </ThemedText>
        {lastShiftIncome > 0 ? (
          <View style={[styles.incomeTag, { backgroundColor: theme.successLight }]}>
            <ThemedText style={[styles.incomeText, { color: theme.success }]}>
              +{formatBalance(lastShiftIncome)} ₽ за последнюю смену
            </ThemedText>
          </View>
        ) : null}
      </View>
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
  incomeTag: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  incomeText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
