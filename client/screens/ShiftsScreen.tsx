import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

export default function ShiftsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
          paddingBottom: Spacing.lg + 60 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.successLight }]}>
            <Feather name="clock" size={32} color={theme.success} />
          </View>
          <ThemedText type="h4" style={styles.emptyTitle}>
            Нет смен
          </ThemedText>
          <ThemedText 
            type="small" 
            style={[styles.emptyDescription, { color: theme.textSecondary }]}
          >
            Добавьте свою первую рабочую смену, чтобы начать отслеживать заработок
          </ThemedText>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomButtonContainer,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.success },
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
            Добавить смену
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing["3xl"],
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyDescription: {
    textAlign: "center",
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    backgroundColor: "transparent",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.xl,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonIcon: {
    marginRight: Spacing.sm,
  },
  addButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
