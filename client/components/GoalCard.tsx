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
type Goal = {
  id: string;
  userId: string | null;
  name: string;
  iconKey: string;
  iconColor: string;
  iconBgColor: string;
  targetAmount: string | number;
  currentAmount: string | number;
  status: 'active' | 'completed';
  isPrimary: boolean;
  orderIndex: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
  onLongPress?: () => void;
  showPrimaryBadge?: boolean;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

function calculateShiftsRemaining(currentAmount: number, targetAmount: number, avgEarningsPerShift: number = 3200): number {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / avgEarningsPerShift);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
  target: "target",
  send: "send",
  monitor: "monitor",
  truck: "truck",
  home: "home",
  heart: "heart",
  star: "star",
  gift: "gift",
  briefcase: "briefcase",
  book: "book",
  camera: "camera",
  music: "music",
  shopping: "shopping-cart",
  travel: "map-pin",
  education: "book-open",
  health: "activity",
  car: "truck",
  phone: "smartphone",
  laptop: "hard-drive",
  watch: "watch",
};

export function GoalCard({ goal, onPress, onLongPress, showPrimaryBadge }: GoalCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  
  const currentAmount = parseFloat(String(goal.currentAmount));
  const targetAmount = parseFloat(String(goal.targetAmount));
  const progress = Math.min((currentAmount / targetAmount) * 100, 100);
  const progressPercent = Math.round(progress);
  const shiftsRemaining = calculateShiftsRemaining(currentAmount, targetAmount);
  const iconName = iconMap[goal.iconKey] || "target";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
  };

  const isCompleted = goal.status === "completed";

  return (
    <AnimatedPressable
      style={[
        styles.container,
        { backgroundColor: theme.backgroundContent, borderColor: theme.border },
        animatedStyle,
        isCompleted && { opacity: 0.7 },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {showPrimaryBadge && goal.isPrimary && (
        <View style={[styles.primaryBadge, { backgroundColor: theme.accent }]}>
          <Feather name="star" size={10} color="#FFFFFF" />
        </View>
      )}
      
      <View style={styles.leftSection}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: goal.iconBgColor || theme.accentLight },
          ]}
        >
          <Feather name={iconName} size={20} color={goal.iconColor || theme.accent} />
        </View>

        <View style={styles.content}>
          <ThemedText type="body" style={styles.title}>
            {goal.name}
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
                    backgroundColor: isCompleted ? theme.success : theme.progressFill,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.amountRow}>
            <ThemedText type="small" style={[styles.currentAmount, { color: theme.accent }]}>
              {formatAmount(currentAmount)}
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.targetAmount, { color: theme.textSecondary }]}
            >
              {" "}из {formatAmount(targetAmount)}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={[styles.percentageBadge, { backgroundColor: isCompleted ? theme.successLight : theme.accentLight }]}>
          <ThemedText
            type="small"
            style={[styles.percentage, { color: isCompleted ? theme.success : theme.accent }]}
          >
            {progressPercent}%
          </ThemedText>
        </View>
        {!isCompleted && (
          <ThemedText
            type="caption"
            style={[styles.shiftsRemaining, { color: theme.textSecondary }]}
          >
            ~{shiftsRemaining} смен
          </ThemedText>
        )}
        {isCompleted && (
          <ThemedText
            type="caption"
            style={[styles.shiftsRemaining, { color: theme.success }]}
          >
            Выполнено
          </ThemedText>
        )}
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
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    position: "relative",
  },
  primaryBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
