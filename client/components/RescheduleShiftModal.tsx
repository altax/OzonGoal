import { useState, useEffect } from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useUpdateShift, useShifts } from "@/api";

type ShiftType = {
  id: string;
  operationType: string;
  shiftType: string;
  scheduledDate: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: string;
  earnings: string | null;
};

interface RescheduleShiftModalProps {
  visible: boolean;
  shift: ShiftType | null;
  onClose: () => void;
}

function RescheduleShiftModalContent({ visible, shift, onClose }: RescheduleShiftModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const updateShift = useUpdateShift();
  const { data: allShifts = [] } = useShifts();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (shift) {
      setSelectedDate(new Date(shift.scheduledDate));
    }
  }, [shift]);

  const isDateConflict = (date: Date): boolean => {
    if (!shift) return false;
    
    const dateStr = date.toISOString().split('T')[0];
    
    return allShifts.some((s) => {
      if (s.id === shift.id) return false;
      if (s.status === 'canceled') return false;
      if (s.shiftType !== shift.shiftType) return false;
      
      const shiftDateStr = new Date(s.scheduledDate).toISOString().split('T')[0];
      return shiftDateStr === dateStr;
    });
  };

  const generateDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDateLabel = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateDay.getTime() === today.getTime()) {
      return "Сегодня";
    }
    if (dateDay.getTime() === tomorrow.getTime()) {
      return "Завтра";
    }
    
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const handleSave = async () => {
    if (!shift || !selectedDate) return;
    
    try {
      await updateShift.mutateAsync({
        id: shift.id,
        scheduledDate: selectedDate.toISOString(),
      });
      onClose();
    } catch (error) {
      console.error("Failed to reschedule shift:", error);
    }
  };

  const dates = generateDates();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <BlurView
        intensity={20}
        tint={isDark ? "dark" : "light"}
        style={styles.blurContainer}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundContent,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          
          <View style={styles.header}>
            <ThemedText type="h4" style={styles.title}>
              Перенести смену
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="small" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Выберите новую дату для смены
          </ThemedText>

          <ScrollView
            style={styles.datesContainer}
            contentContainerStyle={styles.datesContent}
            showsVerticalScrollIndicator={false}
          >
            {dates.map((date) => {
              const isSelected = selectedDate && 
                date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();
              const hasConflict = isDateConflict(date);
              
              return (
                <Pressable
                  key={date.toISOString()}
                  style={[
                    styles.dateOption,
                    { 
                      backgroundColor: hasConflict 
                        ? theme.backgroundSecondary 
                        : isSelected 
                          ? theme.accent 
                          : theme.backgroundSecondary,
                      borderColor: hasConflict 
                        ? theme.border 
                        : isSelected 
                          ? theme.accent 
                          : theme.border,
                      opacity: hasConflict ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => !hasConflict && setSelectedDate(date)}
                  disabled={hasConflict}
                >
                  <Feather 
                    name={hasConflict ? "x-circle" : "calendar"} 
                    size={18} 
                    color={hasConflict ? theme.error : isSelected ? "#FFFFFF" : theme.textSecondary} 
                  />
                  <View style={styles.dateTextContainer}>
                    <ThemedText 
                      style={[
                        styles.dateText, 
                        { color: hasConflict ? theme.textSecondary : isSelected ? "#FFFFFF" : theme.text }
                      ]}
                    >
                      {formatDateLabel(date)}
                    </ThemedText>
                    {hasConflict && (
                      <ThemedText 
                        type="caption" 
                        style={{ color: theme.error, fontSize: 11 }}
                      >
                        Уже есть {shift?.shiftType === "day" ? "дневная" : "ночная"} смена
                      </ThemedText>
                    )}
                  </View>
                  {isSelected && !hasConflict && (
                    <Feather name="check" size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: theme.accent },
              updateShift.isPending && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={updateShift.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {updateShift.isPending ? "Сохранение..." : "Сохранить"}
            </ThemedText>
          </Pressable>
        </View>
      </BlurView>
    </Modal>
  );
}

export function RescheduleShiftModal(props: RescheduleShiftModalProps) {
  return <RescheduleShiftModalContent {...props} />;
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  title: {
    fontWeight: "700",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.xl,
  },
  datesContainer: {
    maxHeight: 300,
  },
  datesContent: {
    gap: Spacing.sm,
  },
  dateOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.md,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontWeight: "500",
    fontSize: 15,
  },
  saveButton: {
    marginTop: Spacing.xl,
    height: 52,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
