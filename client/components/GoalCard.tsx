import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const progressPercent = Math.round(progress);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
  };

  return (
    <AnimatedPressable
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault },
        Shadows.card,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.leftSection}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.accentLight },
          ]}
        >
          <Feather name={goal.icon} size={20} color={theme.accent} />
        </View>

        <View style={styles.content}>
          <ThemedText type="body" style={styles.title}>
            {goal.title}
          </ThemedText>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.progressBackground },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.progressFill,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.amountRow}>
            <ThemedText type="small" style={[styles.currentAmount, { color: theme.accent }]}>
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
        <View style={[styles.percentageBadge, { backgroundColor: theme.accentLight }]}>
          <ThemedText
            type="small"
            style={[styles.percentage, { color: theme.accent }]}
          >
            {progressPercent}%
          </ThemedText>
        </View>
        <ThemedText
          type="caption"
          style={[styles.shiftsRemaining, { color: theme.textSecondary }]}
        >
          ~{goal.shiftsRemaining} смен
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing["2xl"],
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  progressBarContainer: {
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
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
    marginLeft: Spacing.lg,
  },
  percentageBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
  },
  percentage: {
    fontWeight: "700",
  },
  shiftsRemaining: {
    fontSize: 11,
  },
});
