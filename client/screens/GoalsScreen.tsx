import { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard } from "@/components/GoalCard";
import { AddGoalModal } from "@/components/AddGoalModal";
import { useGoals } from "@/api";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const demoGoals = [
  {
    id: "1",
    userId: null,
    name: "Отпуск в Турции",
    iconKey: "send",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: "65000",
    targetAmount: "100000",
    status: "active",
    isPrimary: true,
    orderIndex: 0,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    userId: null,
    name: "Новый MacBook",
    iconKey: "monitor",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: "40000",
    targetAmount: "160000",
    status: "active",
    isPrimary: false,
    orderIndex: 1,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    userId: null,
    name: "Новая машина",
    iconKey: "truck",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: "60000",
    targetAmount: "500000",
    status: "active",
    isPrimary: false,
    orderIndex: 2,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    userId: null,
    name: "Ремонт квартиры",
    iconKey: "home",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: "120000",
    targetAmount: "300000",
    status: "active",
    isPrimary: false,
    orderIndex: 3,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const BUTTON_AREA_HEIGHT = 72;

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const { data: goals, isLoading } = useGoals();

  const displayGoals = goals && goals.length > 0 ? goals : demoGoals;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing["2xl"],
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: BUTTON_AREA_HEIGHT + insets.bottom + Spacing["2xl"],
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          displayGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onPress={() => {}} />
          ))
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
