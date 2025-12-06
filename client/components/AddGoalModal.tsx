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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCreateGoal } from "@/api";

interface AddGoalModalProps {
  visible: boolean;
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

export function AddGoalModal({ visible, onClose }: AddGoalModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const createGoal = useCreateGoal();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("target");
  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setSelectedIcon("target");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Введите название цели");
      return;
    }

    const amount = parseFloat(targetAmount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setError("Введите корректную сумму");
      return;
    }

    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        targetAmount: amount.toString(),
        iconKey: selectedIcon,
        iconColor: "#3B82F6",
        iconBgColor: "#E0E7FF",
      });
      handleClose();
    } catch (e) {
      setError("Не удалось создать цель. Попробуйте ещё раз.");
    }
  };

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) return "";
    const number = parseInt(cleaned, 10);
    return new Intl.NumberFormat("ru-RU").format(number);
  };

  const handleAmountChange = (text: string) => {
    setTargetAmount(formatAmount(text));
    setError("");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
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
            Новая цель
          </ThemedText>
          <View style={styles.headerSpacer} />
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
              autoFocus
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
              onChangeText={handleAmountChange}
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
              createGoal.isPending && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={createGoal.isPending}
          >
            {createGoal.isPending ? (
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
                  Создать цель
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
