import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { Spacing, BorderRadius } from "@/constants/theme";

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
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace('.0', '') + 'М';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(0) + 'К';
  }
  return new Intl.NumberFormat("ru-RU").format(amount);
}

function formatFullAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}

function getMotivationalPhrase(progressPercent: number, isCompleted: boolean): string {
  if (isCompleted || progressPercent >= 100) {
    return "Цель достигнута!";
  } else if (progressPercent >= 75) {
    return "Финишная прямая";
  } else if (progressPercent >= 50) {
    return "Половина пути";
  } else if (progressPercent >= 25) {
    return "Отличный старт";
  } else if (progressPercent > 0) {
    return "Начало положено";
  } else {
    return "К цели";
  }
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

const MILESTONES = [25, 50, 75, 100];
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
  const iconName = iconMap[goal.iconKey] || "target";
  const isCompleted = goal.status === "completed" || progressPercent >= 100;

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

  const gradientColors = isCompleted 
    ? ['#10B981', '#34D399'] 
    : ['#3B82F6', '#8B5CF6'];

  const getCurrentMilestone = () => {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (progressPercent >= MILESTONES[i]) {
        return MILESTONES[i];
      }
    }
    return 0;
  };

  const currentMilestone = getCurrentMilestone();

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
          <Feather name="star" size={20} color="#FFFFFF" />
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
            { 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.8)',
            },
            cardAnimatedStyle,
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {showPrimaryBadge && goal.isPrimary && (
            <View style={styles.primaryBadge}>
              <LinearGradient
                colors={['#F59E0B', '#FBBF24']}
                style={styles.primaryBadgeGradient}
              >
                <Feather name="star" size={10} color="#FFFFFF" />
              </LinearGradient>
            </View>
          )}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: goal.iconBgColor || theme.accentLight },
                ]}
              >
                <Feather name={iconName} size={22} color={goal.iconColor || theme.accent} />
              </View>
              <View style={styles.titleContainer}>
                <ThemedText style={[styles.title, { color: theme.text }]}>
                  {goal.name}
                </ThemedText>
                <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {getMotivationalPhrase(progressPercent, isCompleted)}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.percentageContainer}>
              <ThemedText style={[
                styles.percentageValue, 
                { color: isCompleted ? theme.success : theme.accent }
              ]}>
                {progressPercent}
              </ThemedText>
              <ThemedText style={[styles.percentageSign, { color: theme.textSecondary }]}>
                %
              </ThemedText>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.6)' }]}>
              <LinearGradient
                colors={gradientColors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
              
              <View style={styles.milestonesContainer}>
                {MILESTONES.map((milestone, index) => {
                  const isReached = progressPercent >= milestone;
                  const isActive = milestone === currentMilestone && !isCompleted;
                  
                  return (
                    <View
                      key={milestone}
                      style={[
                        styles.milestonePoint,
                        { 
                          left: `${milestone}%`,
                          backgroundColor: isReached 
                            ? (isCompleted ? '#10B981' : '#3B82F6')
                            : (isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(203, 213, 225, 1)'),
                          transform: [{ translateX: -6 }],
                          borderWidth: isActive ? 2 : 0,
                          borderColor: isActive ? '#FFFFFF' : 'transparent',
                        },
                      ]}
                    >
                      {isReached && (
                        <Feather name="check" size={7} color="#FFFFFF" />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
            
            <View style={styles.milestoneLabels}>
              {MILESTONES.map((milestone) => {
                const amount = (targetAmount * milestone) / 100;
                const isReached = progressPercent >= milestone;
                
                return (
                  <View key={milestone} style={[styles.milestoneLabelContainer, { left: `${milestone}%` }]}>
                    <ThemedText style={[
                      styles.milestoneLabel,
                      { 
                        color: isReached 
                          ? (isCompleted ? theme.success : theme.accent)
                          : theme.textSecondary,
                        opacity: isReached ? 1 : 0.6,
                      }
                    ]}>
                      {formatAmount(amount)}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.amountContainer}>
              <ThemedText style={[styles.currentAmount, { color: theme.text }]}>
                {formatFullAmount(currentAmount)}
              </ThemedText>
              <ThemedText style={[styles.amountDivider, { color: theme.textSecondary }]}>
                {" / "}
              </ThemedText>
              <ThemedText style={[styles.targetAmount, { color: theme.textSecondary }]}>
                {formatFullAmount(targetAmount)}
              </ThemedText>
            </View>
            
            {isCompleted ? (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Feather name="check-circle" size={12} color={theme.success} />
                <ThemedText style={[styles.statusText, { color: theme.success }]}>
                  Готово
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.08)' }]}>
                <ThemedText style={[styles.remainingText, { color: theme.accent }]}>
                  {formatFullAmount(targetAmount - currentAmount)}
                </ThemedText>
              </View>
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
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    position: "relative",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  hideIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD + 30,
    borderRadius: BorderRadius.lg,
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
    borderRadius: BorderRadius.lg,
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
    top: -6,
    right: -6,
    zIndex: 3,
  },
  primaryBadgeGradient: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  percentageContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  percentageValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  percentageSign: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 1,
  },
  progressSection: {
    marginBottom: Spacing.lg,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "visible",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  milestonesContainer: {
    position: "absolute",
    top: -2,
    left: 0,
    right: 0,
    height: 12,
  },
  milestonePoint: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  milestoneLabels: {
    position: "relative",
    height: 20,
    marginTop: Spacing.sm,
  },
  milestoneLabelContainer: {
    position: "absolute",
    transform: [{ translateX: -20 }],
    width: 40,
    alignItems: "center",
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currentAmount: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  amountDivider: {
    fontSize: 14,
    fontWeight: "400",
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  remainingText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
