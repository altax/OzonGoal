import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCreateShift } from "@/api";

interface AddShiftModalProps {
  visible: boolean;
  onClose: () => void;
}

type OperationType = "returns" | "receiving";
type ShiftType = "day" | "night";

const operationTypes: { value: OperationType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "returns", label: "Возвраты", icon: "rotate-ccw" },
  { value: "receiving", label: "Приёмка", icon: "package" },
];

const shiftTypes: { value: ShiftType; label: string; time: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "day", label: "Дневная", time: "08:00 - 20:00", icon: "sun" },
  { value: "night", label: "Ночная", time: "20:00 - 08:00", icon: "moon" },
];

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  return days;
}

function formatDateShort(date: Date): string {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  return `${dayName}, ${day}`;
}

function formatDateFull(date: Date): string {
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

export function AddShiftModal({ visible, onClose }: AddShiftModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const createShift = useCreateShift();

  const [operationType, setOperationType] = useState<OperationType>("returns");
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [error, setError] = useState("");

  const nextDays = getNextDays(14);

  const resetForm = () => {
    setOperationType("returns");
    setShiftType("day");
    setSelectedDate(new Date());
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      await createShift.mutateAsync({
        operationType,
        shiftType,
        scheduledDate: selectedDate.toISOString(),
      });
      handleClose();
    } catch (e: any) {
      if (e?.message?.includes("уже существует")) {
        setError("Смена на этот день и время уже запланирована");
      } else {
        setError("Не удалось создать смену. Попробуйте ещё раз.");
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.backgroundSecondary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleClose}
          >
            <Feather name="x" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="h4" style={styles.headerTitle}>
            Новая смена
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
              ТИП ОПЕРАЦИИ
            </ThemedText>
            <View style={styles.optionsRow}>
              {operationTypes.map((option) => {
                const isSelected = operationType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.optionButton,
                      {
                        backgroundColor: isSelected
                          ? theme.accent
                          : theme.backgroundDefault,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      setOperationType(option.value);
                      setError("");
                    }}
                  >
                    <Feather
                      name={option.icon}
                      size={20}
                      color={isSelected ? "#FFFFFF" : theme.accent}
                    />
                    <ThemedText
                      type="body"
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
              ВРЕМЯ СМЕНЫ
            </ThemedText>
            <View style={styles.optionsRow}>
              {shiftTypes.map((option) => {
                const isSelected = shiftType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.optionButton,
                      {
                        backgroundColor: isSelected
                          ? theme.accent
                          : theme.backgroundDefault,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      setShiftType(option.value);
                      setError("");
                    }}
                  >
                    <Feather
                      name={option.icon}
                      size={20}
                      color={isSelected ? "#FFFFFF" : theme.accent}
                    />
                    <View style={styles.optionTextContainer}>
                      <ThemedText
                        type="body"
                        style={[
                          styles.optionLabel,
                          { color: isSelected ? "#FFFFFF" : theme.text },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={[
                          styles.optionTime,
                          { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary },
                        ]}
                      >
                        {option.time}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
              ДАТА
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScroll}
              contentContainerStyle={styles.dateScrollContent}
            >
              {nextDays.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const today = isToday(date);
                const tomorrow = isTomorrow(date);
                
                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.dateOption,
                      {
                        backgroundColor: isSelected
                          ? theme.accent
                          : theme.backgroundDefault,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      setSelectedDate(date);
                      setError("");
                    }}
                  >
                    <ThemedText
                      type="caption"
                      style={[
                        styles.dateDayName,
                        { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary },
                      ]}
                    >
                      {today ? "Сегодня" : tomorrow ? "Завтра" : formatDateShort(date).split(",")[0]}
                    </ThemedText>
                    <ThemedText
                      type="h4"
                      style={[
                        styles.dateDay,
                        { color: isSelected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {date.getDate()}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={[
                        styles.dateMonth,
                        { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary },
                      ]}
                    >
                      {formatDateFull(date).split(" ")[1].substring(0, 3)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.errorLight }]}>
              <Feather name="alert-circle" size={16} color={theme.error} />
              <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
                {error}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.accent },
              Shadows.fab,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              createShift.isPending && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={createShift.isPending}
          >
            {createShift.isPending ? (
              <ThemedText style={[styles.submitButtonText, { color: theme.buttonText }]}>
                Создание...
              </ThemedText>
            ) : (
              <>
                <Feather
                  name="check"
                  size={18}
                  color={theme.buttonText}
                  style={styles.submitButtonIcon}
                />
                <ThemedText style={[styles.submitButtonText, { color: theme.buttonText }]}>
                  Запланировать смену
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  optionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.md,
  },
  optionLabel: {
    fontWeight: "600",
  },
  optionTextContainer: {
    alignItems: "flex-start",
  },
  optionTime: {
    marginTop: 2,
  },
  dateScroll: {
    marginHorizontal: -Spacing["2xl"],
  },
  dateScrollContent: {
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.md,
  },
  dateOption: {
    width: 72,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDayName: {
    fontSize: 10,
    marginBottom: Spacing.xs,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: "700",
  },
  dateMonth: {
    fontSize: 10,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.sm,
  },
  submitButtonIcon: {
    marginRight: Spacing.sm,
  },
  submitButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
});
