import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

function getCurrentMonth(): string {
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
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
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {getCurrentMonth()}
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.avatar,
            { 
              backgroundColor: theme.accentLight,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => {}}
        >
          <Feather name="user" size={18} color={theme.accent} />
        </Pressable>
      </View>

      <View style={styles.balanceSection}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Баланс
        </ThemedText>
        <ThemedText type="h1" style={styles.balanceAmount}>
          {formatBalance(balance)}
        </ThemedText>
        {lastShiftIncome > 0 ? (
          <View style={[styles.incomeTag, { backgroundColor: theme.successLight }]}>
            <ThemedText type="small" style={{ color: theme.success }}>
              +{formatBalance(lastShiftIncome)} за последнюю смену
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing["2xl"],
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceSection: {
    alignItems: "center",
  },
  balanceAmount: {
    marginVertical: Spacing.xs,
  },
  incomeTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
});
