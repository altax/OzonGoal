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
  useDerivedValue,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard } from "@/components/GoalCard";
import { AddGoalModal } from "@/components/AddGoalModal";
import { EditGoalModal } from "@/components/EditGoalModal";
import { useGoals, useDeleteGoal, useUpdateGoal } from "@/api";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const BUTTON_AREA_HEIGHT = 72;
const GOAL_VIEW_MODE_KEY = "goal_view_mode";

type GoalFilter = "active" | "completed";
type ViewMode = "full" | "compact";

type GoalType = {
  id: string;
  name: string;
  targetAmount: string | number;
  currentAmount: string | number;
  iconKey: string;
  iconColor: string;
  iconBgColor: string;
  status: string;
  isPrimary?: boolean;
};

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [filter, setFilter] = useState<GoalFilter>("active");
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const { data: goals, isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  
  const [tabWidth, setTabWidth] = useState(0);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const indicatorPosition = useSharedValue(0);
  
  useDerivedValue(() => {
    if (isFirstRender) {
      indicatorPosition.value = filter === "active" ? 0 : 1;
    }
  });

  useEffect(() => {
    AsyncStorage.getItem(GOAL_VIEW_MODE_KEY).then((stored) => {
      if (stored === "full" || stored === "compact") {
        setViewMode(stored);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(GOAL_VIEW_MODE_KEY, viewMode).catch(() => {});
  }, [viewMode]);
  
  const handleFilterChange = (newFilter: GoalFilter) => {
    if (isFirstRender) {
      setIsFirstRender(false);
    }
    indicatorPosition.value = withTiming(newFilter === "active" ? 0 : 1, {
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

  const { activeGoals, completedGoals } = useMemo(() => {
    if (!goals) return { activeGoals: [], completedGoals: [] };
    return {
      activeGoals: goals.filter(g => g.status === "active"),
      completedGoals: goals.filter(g => {
        if (g.status !== "completed") return false;
        const current = parseFloat(String(g.currentAmount)) || 0;
        const target = parseFloat(String(g.targetAmount)) || 0;
        return target > 0 && current >= target;
      }),
    };
  }, [goals]);

  const displayGoals = filter === "active" ? activeGoals : completedGoals;
  const hasGoals = displayGoals.length > 0;
  const hasAnyGoals = goals && goals.length > 0;

  const handleHideGoal = (goalId: string) => {
    updateGoal.mutate({ id: goalId, status: "hidden" });
  };

  const handleDeleteGoal = (goalId: string) => {
    deleteGoal.mutate(goalId);
  };

  return (
    <View style={styles.container}>
      {hasAnyGoals && (
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
                onPress={() => handleFilterChange("active")}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    { color: filter === "active" ? theme.text : theme.textSecondary },
                  ]}
                >
                  Активные ({activeGoals.length})
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
                  Завершённые ({completedGoals.length})
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
          ...((!hasGoals && !isLoading) && { flex: 1 }),
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : hasGoals ? (
          displayGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => setSelectedGoal(goal as GoalType)}
              showPrimaryBadge
              onHide={handleHideGoal}
              onDelete={handleDeleteGoal}
              compact={viewMode === "compact"}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.accentLight }]}>
              <Feather name={filter === "active" ? "target" : "check-circle"} size={36} color={theme.accent} />
            </View>
            <ThemedText type="h4" style={styles.emptyTitle}>
              {filter === "active" ? "Нет целей" : "Нет завершённых целей"}
            </ThemedText>
            <ThemedText 
              type="small" 
              style={[styles.emptyDescription, { color: theme.textSecondary }]}
            >
              {filter === "active" 
                ? "Добавьте свою первую цель, чтобы начать копить на мечту"
                : "Завершённые цели будут отображаться здесь"}
            </ThemedText>
          </View>
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
            Добавить цель
          </ThemedText>
        </Pressable>
      </View>

      <AddGoalModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
      />

      <EditGoalModal
        visible={!!selectedGoal}
        goal={selectedGoal}
        onClose={() => setSelectedGoal(null)}
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
  viewModeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  filterToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 3,
    position: "relative",
  },
  filterIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: BorderRadius.sm - 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm - 2,
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
});
