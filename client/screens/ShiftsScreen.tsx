import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

const BUTTON_AREA_HEIGHT = 60;

export default function ShiftsScreen() {
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
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundTertiary }]}>
            <Feather name="clock" size={32} color={theme.textSecondary} />
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
          { 
            paddingBottom: insets.bottom + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.accent },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => {}}
        >
          <Feather
            name="plus"
            size={16}
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
    paddingTop: Spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: BorderRadius.sm,
  },
  addButtonIcon: {
    marginRight: Spacing.xs,
  },
  addButtonText: {
    fontWeight: "500",
    fontSize: 14,
  },
});
