import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

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
  onHide?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  onPin?: (goalId: string) => void;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

function calculateShiftsRemaining(currentAmount: number, targetAmount: number, avgEarningsPerShift: number = 3200): number {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / avgEarningsPerShift);
}

function getMotivationalPhrase(progressPercent: number): string {
  if (progressPercent >= 100) {
    return "Цель достигнута! Отличная работа!";
  } else if (progressPercent >= 75) {
    return "Финишная прямая! Осталось совсем немного!";
  } else if (progressPercent >= 50) {
    return "Половина пути пройдена! Так держать!";
  } else if (progressPercent >= 25) {
    return "Отличный старт! Продолжай в том же духе!";
  } else {
    return "Каждый шаг приближает тебя к цели!";
  }
}

function getMilestoneAmount(targetAmount: number, milestone: number): number {
  return (targetAmount * milestone) / 100;
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

const ACTION_BUTTON_WIDTH = 70;
const SWIPE_THRESHOLD = 80;

export function GoalCard({ goal, onPress, onLongPress, showPrimaryBadge, onHide, onDelete, onPin }: GoalCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const actionsVisible = useSharedValue(false);
  
  const currentAmount = parseFloat(String(goal.currentAmount));
  const targetAmount = parseFloat(String(goal.targetAmount));
  const progress = Math.min((currentAmount / targetAmount) * 100, 100);
  const progressPercent = Math.round(progress);
  const shiftsRemaining = calculateShiftsRemaining(currentAmount, targetAmount);
  const iconName = iconMap[goal.iconKey] || "target";

  const handleHide = () => {
    if (onHide && goal.status !== "completed") {
      onHide(goal.id);
    }
    translateX.value = withSpring(0);
    actionsVisible.value = false;
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(goal.id);
    }
  };

  const handlePin = () => {
    if (onPin) {
      onPin(goal.id);
    }
    translateX.value = withSpring(0);
    actionsVisible.value = false;
  };

  const isCompleted = goal.status === "completed";

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const newX = event.translationX;
      
      if (newX > 0) {
        if (!isCompleted) {
          translateX.value = Math.min(newX, SWIPE_THRESHOLD + 20);
        }
      } else {
        translateX.value = Math.max(newX, -(ACTION_BUTTON_WIDTH * 2 + 20));
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD && !isCompleted) {
        translateX.value = withTiming(SWIPE_THRESHOLD + 50, { duration: 200 }, () => {
          runOnJS(handleHide)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-(ACTION_BUTTON_WIDTH * 2));
        actionsVisible.value = true;
      } else {
        translateX.value = withSpring(0);
        actionsVisible.value = false;
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const hideIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.5, 1], Extrapolation.CLAMP) },
    ],
  }));

  const actionsContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
  };

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.hideIndicator, { backgroundColor: theme.warning }, hideIndicatorStyle]}>
        <Feather name="eye-off" size={20} color="#FFFFFF" />
        <ThemedText style={styles.hideText}>Скрыть</ThemedText>
      </Animated.View>

      <Animated.View style={[styles.actionsContainer, actionsContainerStyle]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={handlePin}
        >
          <Feather name={goal.isPrimary ? "star" : "star"} size={20} color="#FFFFFF" />
          <ThemedText style={styles.actionText}>
            {goal.isPrimary ? "Убрать" : "В топ"}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.error }]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
          <ThemedText style={styles.actionText}>Удалить</ThemedText>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <AnimatedPressable
          style={[
            styles.container,
            { backgroundColor: theme.backgroundContent, borderColor: theme.border },
            cardAnimatedStyle,
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
              
              <ThemedText 
                type="caption" 
                style={[styles.motivationalPhrase, { color: theme.textSecondary }]}
              >
                {getMotivationalPhrase(progressPercent)}
              </ThemedText>
              
              <View style={styles.milestoneProgressContainer}>
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
                
                <View style={styles.milestonesRow}>
                  {[25, 50, 75, 100].map((milestone) => {
                    const milestoneReached = progressPercent >= milestone;
                    const isCurrent = progressPercent >= milestone - 25 && progressPercent < milestone;
                    return (
                      <View 
                        key={milestone} 
                        style={[
                          styles.milestonePoint,
                          { 
                            backgroundColor: milestoneReached 
                              ? (isCompleted ? theme.success : theme.progressFill)
                              : theme.progressBackground,
                            borderColor: milestoneReached 
                              ? (isCompleted ? theme.success : theme.progressFill)
                              : theme.border,
                            opacity: milestoneReached && !isCurrent ? 0.6 : 1,
                          },
                        ]}
                      >
                        {milestoneReached && (
                          <Feather name="check" size={8} color="#FFFFFF" />
                        )}
                      </View>
                    );
                  })}
                </View>
                
                <View style={styles.milestoneLabelsRow}>
                  {[25, 50, 75, 100].map((milestone) => {
                    const milestoneAmount = getMilestoneAmount(targetAmount, milestone);
                    const milestoneReached = progressPercent >= milestone;
                    return (
                      <ThemedText 
                        key={milestone}
                        type="caption" 
                        style={[
                          styles.milestoneLabel,
                          { 
                            color: milestoneReached 
                              ? (isCompleted ? theme.success : theme.accent)
                              : theme.textSecondary,
                            opacity: milestoneReached ? 1 : 0.7,
                          },
                        ]}
                      >
                        {formatAmount(milestoneAmount)}
                      </ThemedText>
                    );
                  })}
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
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: Spacing.lg,
    position: "relative",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    position: "relative",
    zIndex: 2,
  },
  hideIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD + 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    zIndex: 1,
  },
  hideText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 1,
  },
  actionButton: {
    width: ACTION_BUTTON_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    marginLeft: 4,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
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
    zIndex: 3,
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
  motivationalPhrase: {
    fontStyle: "italic",
    fontSize: 11,
    fontWeight: "300",
    marginBottom: Spacing.sm,
  },
  milestoneProgressContainer: {
    marginBottom: Spacing.sm,
    position: "relative",
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
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    top: -3,
    left: 0,
    right: 0,
  },
  milestonePoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  milestoneLabel: {
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
    width: 50,
    marginLeft: -19,
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
