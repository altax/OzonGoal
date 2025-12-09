import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useBalanceHistory, useUser } from "@/api";

interface BalanceHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? "+" : "";
  return sign + new Intl.NumberFormat("ru-RU").format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = [
    "янв", "фев", "мар", "апр", "мая", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек"
  ];
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

function formatBalance(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

export function BalanceHistoryModal({ visible, onClose }: BalanceHistoryModalProps) {
  const { theme } = useTheme();
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <BalanceHistoryModalContent onClose={onClose} />
      </View>
    </Modal>
  );
}

function BalanceHistoryModalContent({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: history, isLoading } = useBalanceHistory();
  const { data: user } = useUser();

  const renderItem = ({ item }: { item: NonNullable<typeof history>[0] }) => {
    const isPositive = item.amount >= 0;
    const iconName: keyof typeof Feather.glyphMap = item.type === "earning" ? "trending-up" : "target";
    const iconColor = isPositive ? theme.success : theme.accent;
    const iconBgColor = isPositive ? theme.successLight : theme.accentLight;
    
    return (
      <View style={[styles.historyItem, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Feather name={iconName} size={18} color={iconColor} />
        </View>
        <View style={styles.itemContent}>
          <ThemedText style={[styles.itemDescription, { color: theme.text }]}>
            {item.description}
          </ThemedText>
          {item.goalName && (
            <ThemedText style={[styles.itemGoal, { color: theme.textSecondary }]}>
              {item.goalName}
            </ThemedText>
          )}
          <ThemedText style={[styles.itemDate, { color: theme.textSecondary }]}>
            {formatDate(item.date)}
          </ThemedText>
        </View>
        <ThemedText
          style={[
            styles.itemAmount,
            { color: isPositive ? theme.success : theme.accent },
          ]}
        >
          {formatAmount(item.amount)} ₽
        </ThemedText>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        История пуста
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        Здесь появится история ваших заработков{"\n"}и пополнений целей
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
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
          История баланса
        </ThemedText>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.balanceCard, { backgroundColor: theme.accent }]}>
        <ThemedText style={styles.balanceLabel}>Текущий баланс</ThemedText>
        <ThemedText style={styles.balanceValue}>
          {formatBalance(parseFloat(user?.balance as string) || 0)} ₽
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Загрузка...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={history || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        />
      )}
    </View>
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
  placeholder: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  balanceCard: {
    marginHorizontal: Spacing["2xl"],
    marginBottom: Spacing["2xl"],
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    ...Shadows.card,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing["2xl"],
    flexGrow: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    ...Shadows.cardLight,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  itemContent: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  itemGoal: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 11,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
});
