import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard, Goal } from "@/components/GoalCard";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const demoGoals: Goal[] = [
  {
    id: "1",
    title: "Отпуск в Турции",
    icon: "send",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: 65000,
    targetAmount: 100000,
    shiftsRemaining: 12,
  },
  {
    id: "2",
    title: "Новый MacBook",
    icon: "monitor",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: 40000,
    targetAmount: 160000,
    shiftsRemaining: 38,
  },
  {
    id: "3",
    title: "Новая машина",
    icon: "truck",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: 60000,
    targetAmount: 500000,
    shiftsRemaining: 138,
  },
  {
    id: "4",
    title: "Ремонт квартиры",
    icon: "home",
    iconColor: "#3B82F6",
    iconBgColor: "#E0E7FF",
    currentAmount: 120000,
    targetAmount: 300000,
    shiftsRemaining: 56,
  },
];

const BUTTON_AREA_HEIGHT = 72;

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

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
        {demoGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onPress={() => {}} />
        ))}
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
          onPress={() => {}}
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
