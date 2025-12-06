import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export type TabKey = "goals" | "shifts" | "statistics" | "settings";

interface Tab {
  key: TabKey;
  label: string;
}

const tabs: Tab[] = [
  { key: "goals", label: "Цели" },
  { key: "shifts", label: "Смены" },
  { key: "statistics", label: "Статистика" },
  { key: "settings", label: "Профиль" },
];

interface SegmentedTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      style={[
        styles.tabItem,
        {
          backgroundColor: isActive ? theme.tabActiveBackground : "transparent",
        },
        isActive && Shadows.cardLight,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <ThemedText
        style={[
          styles.tabLabel,
          { color: isActive ? theme.tabActiveText : theme.tabInactiveText },
          isActive && styles.tabLabelActive,
        ]}
      >
        {tab.label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export function SegmentedTabs({ activeTab, onTabChange }: SegmentedTabsProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabChange(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.lg,
  },
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xs,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "600",
  },
});
