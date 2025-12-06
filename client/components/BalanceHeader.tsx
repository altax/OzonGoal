import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

function getCurrentMonth(): string {
  const months = [
    "ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ",
    "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"
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
        <ThemedText type="caption" style={[styles.monthText, { color: theme.textSecondary }]}>
          {getCurrentMonth()}
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.avatar,
            { opacity: pressed ? 0.7 : 1 },
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
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  monthText: {
    letterSpacing: 1,
    fontWeight: "500",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
  },
  balanceSection: {
    alignItems: "center",
  },
  balanceLabel: {
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  incomeTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
