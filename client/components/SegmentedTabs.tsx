import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

export type TabKey = "goals" | "shifts" | "statistics" | "settings";

interface Tab {
  key: TabKey;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const tabs: Tab[] = [
  { key: "goals", label: "ЦЕЛИ", icon: "target" },
  { key: "shifts", label: "СМЕНЫ", icon: "clock" },
  { key: "statistics", label: "СТАТИСТИКА", icon: "trending-up" },
  { key: "settings", label: "НАСТРОЙКИ", icon: "settings" },
];

interface SegmentedTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

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

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(isActive ? 1 : 1, {
          damping: 15,
          stiffness: 150,
        }),
      },
    ],
  }));

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          isActive && styles.iconContainerActive,
          isActive && { backgroundColor: theme.accent },
          animatedIconStyle,
        ]}
      >
        <Feather
          name={tab.icon}
          size={20}
          color={isActive ? Colors.light.buttonText : theme.tabIconDefault}
        />
      </Animated.View>
      <ThemedText
        type="caption"
        style={[
          styles.tabLabel,
          { color: isActive ? theme.accent : theme.tabIconDefault },
        ]}
      >
        {tab.label}
      </ThemedText>
    </Pressable>
  );
}

export function SegmentedTabs({ activeTab, onTabChange }: SegmentedTabsProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          onPress={() => onTabChange(tab.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  iconContainerActive: {
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});
