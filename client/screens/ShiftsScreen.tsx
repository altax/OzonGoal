import { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { ShiftCard } from "@/components/ShiftCard";
import { RescheduleShiftModal } from "@/components/RescheduleShiftModal";
import { useShifts, useCancelShift } from "@/api";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const AUTO_EARNINGS_SHOWN_KEY = "auto_earnings_shown_shifts";

const BUTTON_AREA_HEIGHT = 72;
const SHIFT_VIEW_MODE_KEY = "shift_view_mode";

type ShiftFilter = "scheduled" | "completed";
type ViewMode = "full" | "compact";

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
  const [selectedShiftForReschedule, setSelectedShiftForReschedule] = useState<ShiftType | null>(null);
  const [filter, setFilter] = useState<ShiftFilter>("scheduled");
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const { data: shifts, isLoading } = useShifts();
  const cancelShift = useCancelShift();
  
  const [tabWidth, setTabWidth] = useState(0);
  const indicatorPosition = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.getItem(SHIFT_VIEW_MODE_KEY).then((stored) => {
      if (stored === "full" || stored === "compact") {
        setViewMode(stored);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(SHIFT_VIEW_MODE_KEY, viewMode).catch(() => {});
  }, [viewMode]);

  useEffect(() => {
    if (!shifts || shifts.length === 0) return;
    if (selectedShiftForEarnings) return;
    
    const checkAutoEarnings = async () => {
      const shownIdsStr = await AsyncStorage.getItem(AUTO_EARNINGS_SHOWN_KEY).catch(() => null);
      const shownIds = new Set<string>(shownIdsStr ? JSON.parse(shownIdsStr) : []);
      
      const completedWithoutEarnings = shifts.find(
        (s) => s.status === "completed" && !s.earnings && !shownIds.has(s.id)
      );
      
      if (completedWithoutEarnings) {
        shownIds.add(completedWithoutEarnings.id);
        await AsyncStorage.setItem(AUTO_EARNINGS_SHOWN_KEY, JSON.stringify([...shownIds])).catch(() => {});
        setSelectedShiftForEarnings(completedWithoutEarnings as ShiftType);
      }
    };
    
    checkAutoEarnings();
  }, [shifts, selectedShiftForEarnings]);
  
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
    const completed = shifts.filter(s => s.status === "completed").sort((a, b) => 
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
    
    return { currentShift: current, scheduledShifts: scheduled, completedShifts: completed };
  }, [shifts]);

  const displayShifts = filter === "scheduled" ? scheduledShifts : completedShifts;
  const hasShiftsInCurrentTab = filter === "scheduled" 
    ? (displayShifts.length > 0 || currentShift !== null)
    : displayShifts.length > 0;
  const hasAnyShifts = shifts && shifts.length > 0;

  const handleCancelShift = async (shiftId: string) => {
    try {
      await cancelShift.mutateAsync(shiftId);
    } catch (error) {
      console.error("Failed to cancel shift:", error);
    }
  };

  const handleRescheduleShift = (shiftId: string) => {
    const shift = shifts?.find(s => s.id === shiftId);
    if (shift) {
      setSelectedShiftForReschedule(shift as ShiftType);
    }
  };

  const renderShiftCard = (shift: any, isCurrentShift: boolean = false) => {
    const shiftData = shift as ShiftType;
    
    return (
      <ShiftCard
        key={shift.id}
        shift={shiftData}
        isCurrentShift={isCurrentShift}
        onPress={() => setSelectedShiftForDetails(shiftData)}
        onRecordEarnings={() => setSelectedShiftForEarnings(shiftData)}
        onCancel={handleCancelShift}
        onReschedule={handleRescheduleShift}
        compact={viewMode === "compact"}
      />
    );
  };

  return (
    <View style={styles.container}>
      {hasAnyShifts && (
        <View style={[styles.filterContainer, { paddingHorizontal: Spacing["2xl"] }]}>
          <View style={styles.filterRow}>
            <View 
              style={[styles.filterToggle, { backgroundColor: theme.backgroundSecondary, flex: 1 }]}
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
            <Pressable
              style={[styles.viewModeButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => setViewMode(viewMode === "full" ? "compact" : "full")}
            >
              <Feather 
                name={viewMode === "compact" ? "list" : "grid"} 
                size={18} 
                color={theme.textSecondary} 
              />
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

      <RescheduleShiftModal
        visible={!!selectedShiftForReschedule}
        shift={selectedShiftForReschedule}
        onClose={() => setSelectedShiftForReschedule(null)}
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  filterToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.xs,
    padding: 3,
    position: "relative",
  },
  viewModeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
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
