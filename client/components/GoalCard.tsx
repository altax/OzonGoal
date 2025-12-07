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
  status: 'active' | 'completed' | 'hidden';
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
  compact?: boolean;
  averageEarningsPerShift?: number;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(amount));
}

function formatShortAmount(amount: number): string {
  if (amount >= 1000000) {
    const val = amount / 1000000;
    return val % 1 === 0 ? val.toFixed(0) + 'М' : val.toFixed(1).replace('.0', '') + 'М';
  }
  if (amount >= 10000) {
    const val = amount / 1000;
    return val % 1 === 0 ? val.toFixed(0) + 'К' : val.toFixed(1).replace('.0', '') + 'К';
  }
  return new Intl.NumberFormat("ru-RU").format(Math.round(amount));
}

function formatFullAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(amount)) + " ₽";
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

const MILESTONES = [0, 25, 50, 75, 100];
const SWIPE_THRESHOLD = 100;

export function GoalCard({ goal, onPress, onLongPress, showPrimaryBadge, onHide, onDelete, compact = false, averageEarningsPerShift = 3200 }: GoalCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  
  const currentAmount = parseFloat(String(goal.currentAmount)) || 0;
  const targetAmount = parseFloat(String(goal.targetAmount)) || 1;
  
  const rawProgress = (currentAmount / targetAmount) * 100;
  const progress = Math.min(rawProgress, 100);
  const progressPercent = Math.floor(progress * 10) / 10;
  
  const isCompleted = goal.status === "completed" || currentAmount >= targetAmount;
  const iconName = iconMap[goal.iconKey] || "target";
  
  const remaining = targetAmount - currentAmount;
  const shiftsNeeded = remaining > 0 ? Math.ceil(remaining / averageEarningsPerShift) : 0;

  const handleHide = () => {
    if (onHide) {
      onHide(goal.id);
    }
    translateX.value = withSpring(0);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(goal.id);
    }
    translateX.value = withSpring(0);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      const newX = event.translationX;
      
      if (newX > 0) {
        translateX.value = Math.min(newX, SWIPE_THRESHOLD + 40);
      } else {
        translateX.value = Math.max(newX, -(SWIPE_THRESHOLD + 40));
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SWIPE_THRESHOLD + 60, { duration: 150 }, () => {
          runOnJS(handleHide)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-(SWIPE_THRESHOLD + 60), { duration: 150 }, () => {
          runOnJS(handleDelete)();
        });
      } else {
        translateX.value = withSpring(0);
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

  const getMilestoneAmount = (milestone: number) => {
    return (targetAmount * milestone) / 100;
  };

  const isMilestoneReached = (milestone: number) => {
    return progressPercent >= milestone;
  };

  if (compact) {
    return (
      <View style={styles.swipeContainer}>
        <Animated.View style={[styles.hideIndicator, { backgroundColor: '#64748B' }, hideIndicatorStyle]}>
          <ThemedText style={styles.swipeActionText}>Скрыть</ThemedText>
        </Animated.View>

        <Animated.View style={[styles.deleteIndicator, { backgroundColor: '#EF4444' }, actionsContainerStyle]}>
          <ThemedText style={styles.swipeActionText}>Удалить</ThemedText>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <AnimatedPressable
            style={[
              styles.containerCompact,
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
              <View style={styles.primaryBadgeCompact}>
                <Feather name="star" size={8} color="#F59E0B" />
              </View>
            )}

            <View style={styles.compactRow}>
              <View
                style={[
                  styles.iconContainerCompact,
                  { backgroundColor: goal.iconBgColor || theme.accentLight },
                ]}
              >
                <Feather name={iconName} size={16} color={goal.iconColor || theme.accent} />
              </View>
              
              <View style={styles.compactContent}>
                <View style={styles.compactHeader}>
                  <ThemedText style={[styles.titleCompact, { color: theme.text }]} numberOfLines={1}>
                    {goal.name}
                  </ThemedText>
                  {!isCompleted && shiftsNeeded > 0 && (
                    <ThemedText style={[styles.shiftsTextCompact, { color: theme.textSecondary }]}>
                      ~{shiftsNeeded} смен
                    </ThemedText>
                  )}
                  <ThemedText style={[
                    styles.percentageCompact, 
                    { color: isCompleted ? theme.success : theme.accent }
                  ]}>
                    {Math.floor(progressPercent)}%
                  </ThemedText>
                </View>
                
                <View style={[styles.progressTrackCompact, { backgroundColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.6)' }]}>
                  <LinearGradient
                    colors={gradientColors as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFillCompact, { width: `${progress}%` }]}
                  />
                </View>
                
                <View style={styles.compactFooter}>
                  <ThemedText style={[styles.amountCompact, { color: theme.textSecondary }]}>
                    {formatAmount(currentAmount)} / {formatAmount(targetAmount)} ₽
                  </ThemedText>
                </View>
              </View>
            </View>
          </AnimatedPressable>
        </GestureDetector>
      </View>
    );
  }

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.hideIndicator, { backgroundColor: '#64748B' }, hideIndicatorStyle]}>
        <ThemedText style={styles.swipeActionText}>Скрыть</ThemedText>
      </Animated.View>

      <Animated.View style={[styles.deleteIndicator, { backgroundColor: '#EF4444' }, actionsContainerStyle]}>
        <ThemedText style={styles.swipeActionText}>Удалить</ThemedText>
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
                <Feather name={iconName} size={20} color={goal.iconColor || theme.accent} />
              </View>
              <View style={styles.titleContainer}>
                <View style={styles.titleRow}>
                  <ThemedText style={[styles.title, { color: theme.text }]}>
                    {goal.name}
                  </ThemedText>
                  {!isCompleted && shiftsNeeded > 0 && (
                    <ThemedText style={[styles.shiftsText, { color: theme.textSecondary }]}>
                      ~{shiftsNeeded} смен
                    </ThemedText>
                  )}
                </View>
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
                {Math.floor(progressPercent)}
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
                {MILESTONES.map((milestone) => {
                  const isReached = isMilestoneReached(milestone);
                  
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
                          transform: [{ translateX: -5 }],
                        },
                      ]}
                    >
                      {isReached && milestone > 0 && (
                        <Feather name="check" size={6} color="#FFFFFF" />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
            
            <View style={styles.milestoneLabels}>
              {MILESTONES.map((milestone) => {
                const amount = getMilestoneAmount(milestone);
                const isReached = isMilestoneReached(milestone);
                
                return (
                  <View key={milestone} style={[styles.milestoneLabelContainer, { left: `${milestone}%` }]}>
                    <ThemedText style={[
                      styles.milestoneLabel,
                      { 
                        color: isReached 
                          ? (isCompleted ? theme.success : theme.accent)
                          : theme.textSecondary,
                        opacity: isReached ? 1 : 0.7,
                      }
                    ]}>
                      {formatShortAmount(amount)}
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
                  ещё {formatFullAmount(targetAmount - currentAmount)}
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
    marginBottom: Spacing.md,
    position: "relative",
  },
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    position: "relative",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  containerCompact: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    position: "relative",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  hideIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD + 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  deleteIndicator: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD + 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  swipeActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  primaryBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    zIndex: 3,
  },
  primaryBadgeCompact: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  iconContainerCompact: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  titleCompact: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
    flex: 1,
  },
  shiftsText: {
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0,
  },
  shiftsTextCompact: {
    fontSize: 11,
    fontWeight: "400",
    marginLeft: Spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  percentageContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
  },
  percentageSign: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 1,
  },
  percentageCompact: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: Spacing.sm,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "visible",
    position: "relative",
  },
  progressTrackCompact: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressFillCompact: {
    height: "100%",
    borderRadius: 2,
  },
  milestonesContainer: {
    position: "absolute",
    top: -2,
    left: 0,
    right: 0,
    height: 10,
  },
  milestonePoint: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneLabels: {
    position: "relative",
    height: 18,
    marginTop: Spacing.xs,
  },
  milestoneLabelContainer: {
    position: "absolute",
    transform: [{ translateX: -18 }],
    width: 36,
    alignItems: "center",
  },
  milestoneLabel: {
    fontSize: 9,
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
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  amountDivider: {
    fontSize: 13,
    fontWeight: "400",
  },
  targetAmount: {
    fontSize: 13,
    fontWeight: "500",
  },
  amountCompact: {
    fontSize: 11,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  remainingText: {
    fontSize: 11,
    fontWeight: "600",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactContent: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactFooter: {
    marginTop: Spacing.xs,
  },
});
