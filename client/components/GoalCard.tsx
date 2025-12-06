import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";

export interface Goal {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  currentAmount: number;
  targetAmount: number;
  shiftsRemaining: number;
}

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const { theme } = useTheme();
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const progressPercent = Math.round(progress);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
      ]}
      onPress={onPress}
    >
      <View style={styles.leftSection}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: goal.iconBgColor },
          ]}
        >
          <Feather name={goal.icon} size={18} color={goal.iconColor} />
        </View>

        <View style={styles.content}>
          <ThemedText type="body" style={styles.title}>
            {goal.title}
          </ThemedText>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: "#F0F0F0" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.accent,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.amountRow}>
            <ThemedText type="small" style={styles.currentAmount}>
              {formatAmount(goal.currentAmount)}
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.targetAmount, { color: theme.textSecondary }]}
            >
              {" "}из {formatAmount(goal.targetAmount)}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <ThemedText
          type="body"
          style={[styles.percentage, { color: theme.text }]}
        >
          {progressPercent}%
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.shiftsRemaining, { color: theme.textSecondary }]}
        >
          ~{goal.shiftsRemaining} смен
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  progressBarContainer: {
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentAmount: {
    fontWeight: "600",
  },
  targetAmount: {
    fontWeight: "400",
  },
  rightSection: {
    alignItems: "flex-end",
    marginLeft: Spacing.md,
  },
  percentage: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  shiftsRemaining: {
    fontSize: 11,
  },
});
