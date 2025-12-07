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
import { Spacing, BorderRadius } from "@/constants/theme";

type ShiftType = {
  id: string;
  operationType: string;
  shiftType: string;
  scheduledDate: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: string;
  earnings: string | null;
};

interface ShiftCardProps {
  shift: ShiftType;
  isCurrentShift?: boolean;
  onPress?: () => void;
  onRecordEarnings?: () => void;
  onCancel?: (shiftId: string) => void;
  onReschedule?: (shiftId: string) => void;
  compact?: boolean;
}

function getSmartDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const shiftDate = new Date(date);
  const shiftDay = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
  
  if (shiftDay.getTime() === today.getTime()) {
    return "Сегодня";
  }
  if (shiftDay.getTime() === tomorrow.getTime()) {
    return "Завтра";
  }
  
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${days[shiftDate.getDay()]}, ${shiftDate.getDate()} ${months[shiftDate.getMonth()]}`;
}

function formatShiftTime(shiftType: string): string {
  return shiftType === "day" ? "08:00 - 20:00" : "20:00 - 08:00";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Запланирована",
    in_progress: "В процессе",
    completed: "Завершена",
    canceled: "Отменена",
    no_show: "Неявка",
  };
  return labels[status] || status;
}

function getStatusColor(status: string, theme: any): string {
  const colors: Record<string, string> = {
    scheduled: theme.accent,
    in_progress: theme.warning,
    completed: theme.success,
    canceled: theme.textSecondary,
    no_show: theme.error,
  };
  return colors[status] || theme.textSecondary;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SWIPE_THRESHOLD = 60;

export function ShiftCard({ 
  shift, 
  isCurrentShift = false, 
  onPress, 
  onRecordEarnings,
  onCancel,
  onReschedule,
  compact = false,
}: ShiftCardProps) {
  const { theme, isDark } = useTheme();
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const isCompleted = shift.status === "completed";
  const isScheduled = shift.status === "scheduled";
  const canRecordEarnings = isCompleted && !shift.earnings;
  const canSwipe = isScheduled && !isCurrentShift;

  const handleCancel = () => {
    if (onCancel) {
      onCancel(shift.id);
    }
    translateX.value = withSpring(0);
  };

  const handleReschedule = () => {
    if (onReschedule) {
      onReschedule(shift.id);
    }
    translateX.value = withSpring(0);
  };

  const panGesture = Gesture.Pan()
    .enabled(canSwipe)
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      const newX = event.translationX;
      
      if (newX > 0) {
        translateX.value = Math.min(newX, SWIPE_THRESHOLD + 20);
      } else {
        translateX.value = Math.max(newX, -(SWIPE_THRESHOLD + 20));
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SWIPE_THRESHOLD + 30, { duration: 150 }, () => {
          runOnJS(handleReschedule)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-(SWIPE_THRESHOLD + 30), { duration: 150 }, () => {
          runOnJS(handleCancel)();
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

  const rescheduleIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.5, 1], Extrapolation.CLAMP) },
    ],
  }));

  const cancelIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0.5], Extrapolation.CLAMP) },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
  };

  if (compact) {
    return (
      <View style={styles.swipeContainer}>
        {canSwipe && (
          <>
            <Animated.View style={[styles.rescheduleIndicator, rescheduleIndicatorStyle]}>
              <Feather name="calendar" size={18} color={theme.textSecondary} style={styles.swipeIcon} />
              <ThemedText style={[styles.swipeActionText, { color: theme.textSecondary }]}>Перенести</ThemedText>
            </Animated.View>

            <Animated.View style={[styles.cancelIndicator, cancelIndicatorStyle]}>
              <ThemedText style={[styles.swipeActionText, { color: theme.textSecondary }]}>Отменить</ThemedText>
              <Feather name="x-circle" size={18} color={theme.textSecondary} style={styles.swipeIcon} />
            </Animated.View>
          </>
        )}

        <GestureDetector gesture={panGesture}>
          <AnimatedPressable
            style={[
              styles.shiftCardCompact,
              { 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: isCurrentShift ? theme.success : (isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.8)'),
              },
              isCurrentShift && { borderWidth: 2 },
              cardAnimatedStyle,
            ]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.compactRow}>
              <View style={[styles.shiftTypeIconCompact, { backgroundColor: isCurrentShift ? theme.successLight : theme.accentLight }]}>
                <Feather
                  name={shift.shiftType === "day" ? "sun" : "moon"}
                  size={14}
                  color={isCurrentShift ? theme.success : theme.accent}
                />
              </View>
              <View style={styles.compactContent}>
                <View style={styles.compactHeader}>
                  <ThemedText style={[styles.titleCompact, { color: theme.text }]} numberOfLines={1}>
                    {shift.operationType === "returns" ? "Возвраты" : "Приёмка"}
                  </ThemedText>
                  <ThemedText style={[styles.dateCompact, { color: theme.textSecondary }]}>
                    {getSmartDateLabel(new Date(shift.scheduledDate))}
                  </ThemedText>
                  {isCurrentShift ? (
                    <View style={[styles.currentBadgeCompact, { backgroundColor: theme.success }]}>
                      <ThemedText style={styles.currentBadgeText}>Сейчас</ThemedText>
                    </View>
                  ) : (
                    <View style={[styles.statusBadgeCompact, { backgroundColor: getStatusColor(shift.status, theme) + "20" }]}>
                      <ThemedText style={[styles.statusTextCompact, { color: getStatusColor(shift.status, theme) }]}>
                        {getStatusLabel(shift.status)}
                      </ThemedText>
                    </View>
                  )}
                </View>
                {shift.earnings && (
                  <ThemedText style={[styles.earningsCompact, { color: theme.success }]}>
                    {new Intl.NumberFormat("ru-RU").format(parseFloat(shift.earnings))} ₽
                  </ThemedText>
                )}
              </View>
            </View>
          </AnimatedPressable>
        </GestureDetector>
      </View>
    );
  }

  return (
    <View style={styles.swipeContainer}>
      {canSwipe && (
        <>
          <Animated.View style={[styles.rescheduleIndicator, rescheduleIndicatorStyle]}>
            <Feather name="calendar" size={20} color={theme.textSecondary} style={styles.swipeIcon} />
            <ThemedText style={[styles.swipeActionText, { color: theme.textSecondary }]}>Перенести</ThemedText>
          </Animated.View>

          <Animated.View style={[styles.cancelIndicator, cancelIndicatorStyle]}>
            <ThemedText style={[styles.swipeActionText, { color: theme.textSecondary }]}>Отменить</ThemedText>
            <Feather name="x-circle" size={20} color={theme.textSecondary} style={styles.swipeIcon} />
          </Animated.View>
        </>
      )}

      <GestureDetector gesture={panGesture}>
        <AnimatedPressable
          style={[
            styles.shiftCard,
            { 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isCurrentShift ? theme.success : (isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.8)'),
            },
            isCurrentShift && { borderWidth: 2 },
            cardAnimatedStyle,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {isCurrentShift && (
            <View style={[styles.currentBadge, { backgroundColor: theme.success }]}>
              <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Текущая смена
              </ThemedText>
            </View>
          )}
          <View style={styles.shiftHeader}>
            <View style={[styles.shiftTypeIcon, { backgroundColor: isCurrentShift ? theme.successLight : theme.accentLight }]}>
              <Feather
                name={shift.shiftType === "day" ? "sun" : "moon"}
                size={18}
                color={isCurrentShift ? theme.success : theme.accent}
              />
            </View>
            <View style={styles.shiftInfo}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {shift.operationType === "returns" ? "Возвраты" : "Приёмка"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {getSmartDateLabel(new Date(shift.scheduledDate))} • {formatShiftTime(shift.shiftType)}
              </ThemedText>
            </View>
            {!isCurrentShift && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status, theme) + "20" }]}>
                <ThemedText type="caption" style={{ color: getStatusColor(shift.status, theme), fontWeight: "500" }}>
                  {getStatusLabel(shift.status)}
                </ThemedText>
              </View>
            )}
          </View>
          {canRecordEarnings && (
            <Pressable
              style={({ pressed }) => [
                styles.recordEarningsButton,
                { backgroundColor: theme.success },
                pressed && { opacity: 0.8 },
              ]}
              onPress={onRecordEarnings}
            >
              <Feather name="dollar-sign" size={16} color="#FFFFFF" />
              <ThemedText style={styles.recordEarningsText}>
                Записать заработок
              </ThemedText>
            </Pressable>
          )}
          {isCompleted && shift.earnings && (
            <View style={[styles.earnedBadge, { backgroundColor: theme.successLight }]}>
              <View style={styles.earnedRow}>
                <ThemedText style={[styles.earnedText, { color: theme.success }]}>
                  Заработано: {new Intl.NumberFormat("ru-RU").format(parseFloat(shift.earnings))} ₽
                </ThemedText>
                <Feather name="chevron-right" size={16} color={theme.success} />
              </View>
            </View>
          )}
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
  shiftCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.xl,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  shiftCardCompact: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  rescheduleIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD + 30,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  cancelIndicator: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD + 30,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  swipeActionText: {
    fontWeight: "600",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  swipeIcon: {
    marginHorizontal: 6,
  },
  currentBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
  },
  currentBadgeCompact: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  shiftTypeIconCompact: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  shiftInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  statusBadgeCompact: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusTextCompact: {
    fontSize: 10,
    fontWeight: "500",
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
    gap: Spacing.sm,
  },
  titleCompact: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  dateCompact: {
    fontSize: 12,
    flex: 1,
  },
  earningsCompact: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  recordEarningsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  recordEarningsText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 13,
  },
  earnedBadge: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  earnedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  earnedText: {
    fontWeight: "500",
    fontSize: 13,
  },
});
