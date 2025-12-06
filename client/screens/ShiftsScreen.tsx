import { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { AddShiftModal } from "@/components/AddShiftModal";
import { RecordEarningsModal } from "@/components/RecordEarningsModal";
import { ShiftDetailsModal } from "@/components/ShiftDetailsModal";
import { useShifts } from "@/api";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const BUTTON_AREA_HEIGHT = 72;

type ShiftFilter = "scheduled" | "completed";

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

export default function ShiftsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedShiftForEarnings, setSelectedShiftForEarnings] = useState<ShiftType | null>(null);
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<ShiftType | null>(null);
  const [filter, setFilter] = useState<ShiftFilter>("scheduled");
  const { data: shifts, isLoading } = useShifts();
  
  const [tabWidth, setTabWidth] = useState(0);
  const indicatorPosition = useSharedValue(0);
  
  const handleFilterChange = (newFilter: ShiftFilter) => {
    indicatorPosition.value = withTiming(newFilter === "scheduled" ? 0 : 1, {
      duration: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    setFilter(newFilter);
  };
  
  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value * tabWidth }],
  }));

  const handleTabLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    const padding = 3;
    const width = (totalWidth - padding * 2) / 2;
    setTabWidth(width);
  };

  const { currentShift, scheduledShifts, completedShifts } = useMemo(() => {
    if (!shifts) return { currentShift: null, scheduledShifts: [], completedShifts: [] };
    
    const current = shifts.find(s => s.status === "in_progress") || null;
    const scheduled = shifts.filter(s => s.status === "scheduled").sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
    const completed = shifts.filter(s => s.status === "completed" || s.status === "canceled").sort((a, b) => 
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
    
    return { currentShift: current, scheduledShifts: scheduled, completedShifts: completed };
  }, [shifts]);

  const displayShifts = filter === "scheduled" ? scheduledShifts : completedShifts;
  const hasShiftsInCurrentTab = filter === "scheduled" 
    ? (displayShifts.length > 0 || currentShift !== null)
    : displayShifts.length > 0;
  const hasAnyShifts = shifts && shifts.length > 0;

  const renderShiftCard = (shift: any, isCurrentShift: boolean = false) => {
    const isCompleted = shift.status === "completed";
    const canRecordEarnings = isCompleted && !shift.earnings;
    const shiftData = shift as ShiftType;
    
    return (
      <Pressable
        key={shift.id}
        style={({ pressed }) => [
          styles.shiftCard,
          { backgroundColor: theme.backgroundContent, borderColor: isCurrentShift ? theme.warning : theme.border },
          isCurrentShift && { borderWidth: 2 },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => isCompleted ? setSelectedShiftForDetails(shiftData) : setSelectedShiftForDetails(shiftData)}
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
            onPress={() => setSelectedShiftForEarnings(shiftData)}
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
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {hasAnyShifts && (
        <View style={[styles.filterContainer, { paddingHorizontal: Spacing["2xl"] }]}>
          <View 
            style={[styles.filterToggle, { backgroundColor: theme.backgroundSecondary }]}
            onLayout={handleTabLayout}
          >
            <Animated.View 
              style={[
                styles.filterIndicator, 
                { backgroundColor: theme.backgroundContent, width: tabWidth > 0 ? tabWidth : "48%" },
                animatedIndicatorStyle,
              ]} 
            />
            <Pressable
              style={styles.filterButton}
              onPress={() => handleFilterChange("scheduled")}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: filter === "scheduled" ? theme.text : theme.textSecondary },
                ]}
              >
                Запланированные ({scheduledShifts.length})
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.filterButton}
              onPress={() => handleFilterChange("completed")}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: filter === "completed" ? theme.text : theme.textSecondary },
                ]}
              >
                Прошедшие ({completedShifts.length})
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: BUTTON_AREA_HEIGHT + insets.bottom + Spacing["2xl"],
          ...((!hasShiftsInCurrentTab && !isLoading) && { flex: 1 }),
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <>
            {currentShift && filter === "scheduled" && renderShiftCard(currentShift, true)}
            {hasShiftsInCurrentTab ? (
              displayShifts.map((shift) => renderShiftCard(shift))
            ) : !currentShift && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.accentLight }]}>
                  <Feather name={filter === "scheduled" ? "clock" : "check-circle"} size={36} color={theme.accent} />
                </View>
                <ThemedText type="h4" style={styles.emptyTitle}>
                  {filter === "scheduled" ? "Нет запланированных смен" : "Нет прошедших смен"}
                </ThemedText>
                <ThemedText 
                  type="small" 
                  style={[styles.emptyDescription, { color: theme.textSecondary }]}
                >
                  {filter === "scheduled" 
                    ? "Добавьте рабочую смену, чтобы начать отслеживать заработок"
                    : "Завершённые смены будут отображаться здесь"}
                </ThemedText>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomButtonContainer,
          { 
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundContent,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.accent },
            Shadows.fab,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Feather
            name="plus"
            size={18}
            color={theme.buttonText}
            style={styles.addButtonIcon}
          />
          <ThemedText
            style={[styles.addButtonText, { color: theme.buttonText }]}
          >
            Добавить смену
          </ThemedText>
        </Pressable>
      </View>

      <AddShiftModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
      />

      <RecordEarningsModal
        visible={!!selectedShiftForEarnings}
        shift={selectedShiftForEarnings}
        onClose={() => setSelectedShiftForEarnings(null)}
      />

      <ShiftDetailsModal
        visible={!!selectedShiftForDetails}
        shift={selectedShiftForDetails}
        onClose={() => setSelectedShiftForDetails(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  filterToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.xs,
    padding: 3,
    position: "relative",
  },
  filterIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: BorderRadius.xs - 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs - 2,
    alignItems: "center",
    zIndex: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  currentBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
  },
  shiftCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  emptyTitle: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  emptyDescription: {
    textAlign: "center",
    lineHeight: 22,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.sm,
  },
  addButtonIcon: {
    marginRight: Spacing.sm,
  },
  addButtonText: {
    fontWeight: "600",
    fontSize: 15,
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
