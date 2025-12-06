import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Card } from "@/components/Card";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

function SettingsItem({ icon, title, value, onPress, showChevron = true }: SettingsItemProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        { 
          backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
          borderBottomColor: theme.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.settingsItemIcon, { backgroundColor: theme.accentLight }]}>
          <Feather name={icon} size={18} color={theme.accent} />
        </View>
        <ThemedText type="body">{title}</ThemedText>
      </View>
      <View style={styles.settingsItemRight}>
        {value ? (
          <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>
            {value}
          </ThemedText>
        ) : null}
        {showChevron ? (
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing["2xl"],
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: Spacing["4xl"] + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="h3" style={styles.screenTitle}>
          Настройки
        </ThemedText>
        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={[styles.avatar, { backgroundColor: theme.accentLight }]}>
              <Feather name="user" size={32} color={theme.accent} />
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="h4">Пользователь</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Нажмите для редактирования
              </ThemedText>
            </View>
            <View style={[styles.chevronBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          </View>
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          ОСНОВНЫЕ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="dollar-sign" title="Валюта" value="RUB" />
          <SettingsItem icon="globe" title="Язык" value="Русский" />
          <SettingsItem icon="bell" title="Уведомления" />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          ВНЕШНИЙ ВИД
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="moon" title="Тема" value="Системная" />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          ДАННЫЕ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="download" title="Экспорт данных" />
          <SettingsItem icon="trash-2" title="Очистить данные" />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          О ПРИЛОЖЕНИИ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="info" title="Версия" value="1.0.0" showChevron={false} />
          <SettingsItem icon="help-circle" title="Помощь" />
        </Card>
      </ScrollView>
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
  screenTitle: {
    marginBottom: Spacing["2xl"],
  },
  profileCard: {
    marginBottom: Spacing["2xl"],
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  chevronBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
    letterSpacing: 1,
  },
  settingsGroup: {
    marginBottom: Spacing["2xl"],
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  settingsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
