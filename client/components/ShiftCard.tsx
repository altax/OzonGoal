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

const ACTION_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = 80;

export function ShiftCard({ 
  shift, 
  isCurrentShift = false, 
  onPress, 
  onRecordEarnings,
  onCancel,
  onReschedule,
}: ShiftCardProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const actionsVisible = useSharedValue(false);
  const scale = useSharedValue(1);

  const isCompleted = shift.status === "completed";
  const isCanceled = shift.status === "canceled";
  const isScheduled = shift.status === "scheduled";
  const canRecordEarnings = isCompleted && !shift.earnings;
  const canSwipe = isScheduled && !isCurrentShift;

  const handleCancel = () => {
    if (onCancel) {
      onCancel(shift.id);
    }
    translateX.value = withSpring(0);
    actionsVisible.value = false;
  };

  const handleReschedule = () => {
    if (onReschedule) {
      onReschedule(shift.id);
    }
    translateX.value = withSpring(0);
    actionsVisible.value = false;
  };

  const panGesture = Gesture.Pan()
    .enabled(canSwipe)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const newX = event.translationX;
      
      if (newX > 0) {
        translateX.value = Math.min(newX, SWIPE_THRESHOLD + 20);
      } else {
        translateX.value = Math.max(newX, -(ACTION_BUTTON_WIDTH + 20));
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SWIPE_THRESHOLD + 50, { duration: 200 }, () => {
          runOnJS(handleReschedule)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-ACTION_BUTTON_WIDTH);
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

  const rescheduleIndicatorStyle = useAnimatedStyle(() => ({
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
      {canSwipe && (
        <>
          <Animated.View style={[styles.rescheduleIndicator, { backgroundColor: theme.accent }, rescheduleIndicatorStyle]}>
            <Feather name="calendar" size={20} color="#FFFFFF" />
            <ThemedText style={styles.indicatorText}>Перенести</ThemedText>
          </Animated.View>

          <Animated.View style={[styles.actionsContainer, actionsContainerStyle]}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.error }]}
              onPress={handleCancel}
            >
              <Feather name="x-circle" size={20} color="#FFFFFF" />
              <ThemedText style={styles.actionText}>Отменить</ThemedText>
            </Pressable>
          </Animated.View>
        </>
      )}

      <GestureDetector gesture={panGesture}>
        <AnimatedPressable
          style={[
            styles.shiftCard,
            { 
              backgroundColor: theme.backgroundContent, 
              borderColor: isCurrentShift ? theme.warning : theme.border,
            },
            isCurrentShift && { borderWidth: 2 },
            cardAnimatedStyle,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {isCurrentShift && (
            <View style={[styles.currentBadge, { backgroundColor: theme.warning }]}>
              <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Текущая смена
              </ThemedText>
            </View>
          )}
          <View style={styles.shiftHeader}>
            <View style={[styles.shiftTypeIcon, { backgroundColor: isCurrentShift ? theme.warningLight : theme.accentLight }]}>
              <Feather
                name={shift.shiftType === "day" ? "sun" : "moon"}
                size={18}
                color={isCurrentShift ? theme.warning : theme.accent}
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
    marginBottom: Spacing.lg,
    position: "relative",
  },
  shiftCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.xl,
    zIndex: 2,
  },
  rescheduleIndicator: {
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
  indicatorText: {
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
  currentBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
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
  shiftInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
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
