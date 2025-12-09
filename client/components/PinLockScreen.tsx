import { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Vibration, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/contexts/SettingsContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

const PIN_LENGTH = 4;

export function PinLockScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { unlockApp } = useSettings();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const shakeX = useSharedValue(0);

  const handleNumberPress = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === PIN_LENGTH) {
        const success = unlockApp(newPin);
        if (!success) {
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
          setTimeout(() => setPin(""), 300);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
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
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={[styles.lockIcon, { backgroundColor: theme.accentLight }]}>
          <Feather name="lock" size={32} color={theme.accent} />
        </View>
        
        <ThemedText type="h4" style={styles.title}>
          Введите PIN-код
        </ThemedText>
        
        {error && (
          <ThemedText type="caption" style={[styles.errorText, { color: theme.error }]}>
            Неверный PIN-код
          </ThemedText>
        )}
        
        {renderDots()}
      </View>
      
      <View style={[styles.keypadContainer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {renderKeypad()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
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
});
