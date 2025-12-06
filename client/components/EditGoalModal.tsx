import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useUpdateGoal, useDeleteGoal } from "@/api";

interface Goal {
  id: string;
  name: string;
  targetAmount: string | number;
  currentAmount: string | number;
  iconKey: string;
  iconColor: string;
  iconBgColor: string;
  status: string;
}

interface EditGoalModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
}

const iconOptions: { key: string; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: "target", icon: "target", label: "Цель" },
  { key: "send", icon: "send", label: "Путешествие" },
  { key: "monitor", icon: "monitor", label: "Техника" },
  { key: "home", icon: "home", label: "Дом" },
  { key: "truck", icon: "truck", label: "Авто" },
  { key: "heart", icon: "heart", label: "Здоровье" },
  { key: "gift", icon: "gift", label: "Подарок" },
  { key: "book", icon: "book-open", label: "Обучение" },
  { key: "briefcase", icon: "briefcase", label: "Работа" },
  { key: "star", icon: "star", label: "Мечта" },
];

function formatAmountStatic(value: string | number): string {
  const text = String(value ?? "");
  const cleaned = text.replace(/[^\d]/g, "");
  if (!cleaned) return "";
  const number = parseInt(cleaned, 10);
  return new Intl.NumberFormat("ru-RU").format(number);
}

export function EditGoalModal({ visible, goal, onClose }: EditGoalModalProps) {
  if (!goal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemeProvider>
        <EditGoalModalContent goal={goal} onClose={onClose} />
      </ThemeProvider>
    </Modal>
  );
}

function EditGoalModalContent({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(formatAmountStatic(goal.targetAmount));
  const [currentAmount, setCurrentAmount] = useState(formatAmountStatic(goal.currentAmount));
  const [selectedIcon, setSelectedIcon] = useState(goal.iconKey || "target");
  const [error, setError] = useState("");

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Введите название цели");
      return;
    }

    const target = parseFloat(targetAmount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(target) || target <= 0) {
      setError("Введите корректную целевую сумму");
      return;
    }

    const current = parseFloat(currentAmount.replace(/\s/g, "").replace(",", ".")) || 0;

    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        name: name.trim(),
        targetAmount: target.toString(),
        currentAmount: current.toString(),
        iconKey: selectedIcon,
      });
      handleClose();
    } catch (e) {
      setError("Не удалось обновить цель. Попробуйте ещё раз.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Удалить цель?",
      `Вы уверены, что хотите удалить цель "${goal.name}"?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGoal.mutateAsync(goal.id);
              handleClose();
            } catch (e) {
              setError("Не удалось удалить цель");
            }
          },
        },
      ]
    );
  };

  const handleMarkComplete = async () => {
    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        status: goal.status === "completed" ? "active" : "completed",
      });
      handleClose();
    } catch (e) {
      setError("Не удалось изменить статус цели");
    }
  };

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) return "";
    const number = parseInt(cleaned, 10);
    return new Intl.NumberFormat("ru-RU").format(number);
  };

  const handleAmountChange = (setter: (value: string) => void) => (text: string) => {
    setter(formatAmount(text));
    setError("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
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
          Редактировать
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: theme.errorLight },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            НАЗВАНИЕ ЦЕЛИ
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Например: Отпуск в Турции"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError("");
            }}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            ЦЕЛЕВАЯ СУММА (₽)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="100 000"
            placeholderTextColor={theme.textSecondary}
            value={targetAmount}
            onChangeText={handleAmountChange(setTargetAmount)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            НАКОПЛЕНО (₽)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            value={currentAmount}
            onChangeText={handleAmountChange(setCurrentAmount)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            ИКОНКА
          </ThemedText>
          <View style={styles.iconGrid}>
            {iconOptions.map((option) => {
              const isSelected = selectedIcon === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.iconOption,
                    {
                      backgroundColor: isSelected
                        ? theme.accent
                        : theme.backgroundDefault,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedIcon(option.key)}
                >
                  <Feather
                    name={option.icon}
                    size={24}
                    color={isSelected ? "#FFFFFF" : theme.accent}
                  />
                  <ThemedText
                    type="caption"
                    style={[
                      styles.iconLabel,
                      { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.statusButton,
            { 
              backgroundColor: goal.status === "completed" ? theme.accentLight : theme.successLight,
              borderColor: goal.status === "completed" ? theme.accent : theme.success,
            },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleMarkComplete}
        >
          <Feather
            name={goal.status === "completed" ? "rotate-ccw" : "check-circle"}
            size={18}
            color={goal.status === "completed" ? theme.accent : theme.success}
          />
          <ThemedText
            style={[
              styles.statusButtonText,
              { color: goal.status === "completed" ? theme.accent : theme.success },
            ]}
          >
            {goal.status === "completed" ? "Вернуть в активные" : "Отметить как завершённую"}
          </ThemedText>
        </Pressable>

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
            updateGoal.isPending && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={updateGoal.isPending}
        >
          {updateGoal.isPending ? (
            <ThemedText style={[styles.submitButtonText, { color: theme.buttonText }]}>
              Сохранение...
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
                Сохранить изменения
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  deleteButton: {
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
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  iconOption: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  iconLabel: {
    fontSize: 11,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "500",
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
