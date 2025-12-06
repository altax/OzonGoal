import { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { AddShiftModal } from "@/components/AddShiftModal";
import { useShifts } from "@/api";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const BUTTON_AREA_HEIGHT = 72;

function formatShiftDate(date: Date): string {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
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

export default function ShiftsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const { data: shifts, isLoading } = useShifts();

  const hasShifts = shifts && shifts.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing["2xl"],
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: BUTTON_AREA_HEIGHT + insets.bottom + Spacing["2xl"],
          ...((!hasShifts && !isLoading) && { flex: 1 }),
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : hasShifts ? (
          shifts.map((shift) => (
            <View
              key={shift.id}
              style={[styles.shiftCard, { backgroundColor: theme.backgroundContent, borderColor: theme.border }]}
            >
              <View style={styles.shiftHeader}>
                <View style={[styles.shiftTypeIcon, { backgroundColor: theme.accentLight }]}>
                  <Feather
                    name={shift.shiftType === "day" ? "sun" : "moon"}
                    size={18}
                    color={theme.accent}
                  />
                </View>
                <View style={styles.shiftInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {shift.operationType === "returns" ? "Возвраты" : "Приёмка"}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {formatShiftDate(new Date(shift.scheduledDate))} • {formatShiftTime(shift.shiftType)}
                  </ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shift.status, theme) + "20" }]}>
                  <ThemedText type="caption" style={{ color: getStatusColor(shift.status, theme), fontWeight: "500" }}>
                    {getStatusLabel(shift.status)}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.accentLight }]}>
              <Feather name="clock" size={36} color={theme.accent} />
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
});
