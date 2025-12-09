import { useState } from "react";
import { View, StyleSheet, Pressable, Modal, Alert, Vibration, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/contexts/SettingsContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

const PIN_LENGTH = 4;

interface PinSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PinSetupModal({ visible, onClose }: PinSetupModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setPinLock, isPinLockEnabled, pinCode } = useSettings();
  
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState(false);
  const shakeX = useSharedValue(0);

  const handleNumberPress = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === PIN_LENGTH) {
        if (step === "enter") {
          setFirstPin(newPin);
          setPin("");
          setStep("confirm");
        } else {
          if (newPin === firstPin) {
            setPinLock(newPin);
            Alert.alert("Готово", "PIN-код успешно установлен", [
              { text: "OK", onPress: onClose }
            ]);
          } else {
            setError(true);
            if (Platform.OS !== "web") {
              Vibration.vibrate(100);
            }
            shakeX.value = withSequence(
              withTiming(-10, { duration: 50 }),
              withTiming(10, { duration: 50 }),
              withTiming(-10, { duration: 50 }),
              withTiming(10, { duration: 50 }),
              withTiming(0, { duration: 50 })
            );
            setTimeout(() => {
              setPin("");
              setFirstPin("");
              setStep("enter");
            }, 300);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleRemovePin = () => {
    Alert.alert(
      "Удалить PIN-код?",
      "Защита приложения будет отключена",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            await setPinLock(null);
            onClose();
          },
        },
      ]
    );
  };

  const animatedDotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const renderDots = () => {
    return (
      <Animated.View style={[styles.dotsContainer, animatedDotsStyle]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < pin.length
                  ? (error ? theme.error : theme.accent)
                  : theme.backgroundSecondary,
                borderColor: error ? theme.error : theme.border,
              },
            ]}
          />
        ))}
      </Animated.View>
    );
  };

  const renderKeypad = () => {
    const rows = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "delete"],
    ];

    return (
      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === "") {
                return <View key={keyIndex} style={styles.keyEmpty} />;
              }
              if (key === "delete") {
                return (
                  <Pressable
                    key={keyIndex}
                    style={({ pressed }) => [
                      styles.key,
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={handleDelete}
                  >
                    <Feather name="delete" size={24} color={theme.text} />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={keyIndex}
                  style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: theme.backgroundSecondary },
                    pressed && { backgroundColor: theme.backgroundTertiary },
                  ]}
                  onPress={() => handleNumberPress(key)}
                >
                  <ThemedText style={styles.keyText}>{key}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingTop: Spacing.md }]}>
        <Pressable
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: theme.backgroundSecondary },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onClose}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" style={styles.headerTitle}>
          {isPinLockEnabled ? "Изменить PIN-код" : "Установить PIN-код"}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.lockIcon, { backgroundColor: theme.accentLight }]}>
          <Feather name="lock" size={32} color={theme.accent} />
        </View>
        
        <ThemedText type="h4" style={styles.title}>
          {step === "enter" ? "Введите новый PIN-код" : "Подтвердите PIN-код"}
        </ThemedText>
        
        {error && (
          <ThemedText type="caption" style={[styles.errorText, { color: theme.error }]}>
            PIN-коды не совпадают
          </ThemedText>
        )}
        
        {renderDots()}
      </View>
      
      <View style={[styles.keypadContainer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {renderKeypad()}
        
        {isPinLockEnabled && (
          <Pressable
            style={({ pressed }) => [
              styles.removeButton,
              { backgroundColor: theme.errorLight },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleRemovePin}
          >
            <Feather name="trash-2" size={18} color={theme.error} />
            <ThemedText type="body" style={{ color: theme.error, marginLeft: Spacing.sm }}>
              Удалить PIN-код
            </ThemedText>
          </Pressable>
        )}
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
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  errorText: {
    marginBottom: Spacing.md,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypadContainer: {
    paddingHorizontal: Spacing["3xl"],
  },
  keypad: {
    gap: Spacing.md,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  keyEmpty: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 28,
    fontWeight: "500",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing["2xl"],
  },
});
