import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { GoalCard, Goal } from "@/components/GoalCard";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

const demoGoals: Goal[] = [
  {
    id: "1",
    title: "Отпуск в Турции",
    icon: "send",
    iconColor: "#D4A574",
    iconBgColor: "#FDF5ED",
    currentAmount: 65000,
    targetAmount: 100000,
    shiftsRemaining: 12,
  },
  {
    id: "2",
    title: "Новый MacBook",
    icon: "monitor",
    iconColor: "#9B8AA0",
    iconBgColor: "#F5F0F7",
    currentAmount: 40000,
    targetAmount: 160000,
    shiftsRemaining: 38,
  },
  {
    id: "3",
    title: "Новая машина",
    icon: "truck",
    iconColor: "#7B9B9B",
    iconBgColor: "#F0F5F5",
    currentAmount: 60000,
    targetAmount: 500000,
    shiftsRemaining: 138,
  },
  {
    id: "4",
    title: "Ремонт квартиры",
    icon: "home",
    iconColor: "#E5B87C",
    iconBgColor: "#FDF8F0",
    currentAmount: 120000,
    targetAmount: 300000,
    shiftsRemaining: 56,
  },
];

const BUTTON_AREA_HEIGHT = 80;

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingBottom: BUTTON_AREA_HEIGHT + insets.bottom + Spacing.xl,
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
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.accent },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => {}}
        >
          <Feather
            name="plus"
            size={20}
            color={Colors.light.buttonText}
            style={styles.addButtonIcon}
          />
          <ThemedText
            type="body"
            style={[styles.addButtonText, { color: Colors.light.buttonText }]}
          >
            Добавить новую цель
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.xl,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonIcon: {
    marginRight: Spacing.sm,
  },
  addButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
