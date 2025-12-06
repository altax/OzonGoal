import { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard } from "@/components/GoalCard";
import { AddGoalModal } from "@/components/AddGoalModal";
import { EditGoalModal } from "@/components/EditGoalModal";
import { useGoals } from "@/api";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const BUTTON_AREA_HEIGHT = 72;

type GoalFilter = "active" | "completed";

type GoalType = {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  iconKey: string;
  iconColor: string;
  iconBgColor: string;
  status: string;
};

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [filter, setFilter] = useState<GoalFilter>("active");
  const { data: goals, isLoading } = useGoals();

  const { activeGoals, completedGoals } = useMemo(() => {
    if (!goals) return { activeGoals: [], completedGoals: [] };
    return {
      activeGoals: goals.filter(g => g.status === "active"),
      completedGoals: goals.filter(g => g.status === "completed"),
    };
  }, [goals]);

  const displayGoals = filter === "active" ? activeGoals : completedGoals;
  const hasGoals = displayGoals.length > 0;
  const hasAnyGoals = goals && goals.length > 0;

  return (
    <View style={styles.container}>
      {hasAnyGoals && (
        <View style={[styles.filterContainer, { paddingHorizontal: Spacing["2xl"] }]}>
          <View style={[styles.filterToggle, { backgroundColor: theme.backgroundRoot }]}>
            <Pressable
              style={[
                styles.filterButton,
                filter === "active" && { backgroundColor: theme.backgroundContent },
              ]}
              onPress={() => setFilter("active")}
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
              style={[
                styles.filterButton,
                filter === "completed" && { backgroundColor: theme.backgroundContent },
              ]}
              onPress={() => setFilter("completed")}
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
            <GoalCard key={goal.id} goal={goal} onPress={() => setSelectedGoal(goal as GoalType)} />
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  filterToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
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
