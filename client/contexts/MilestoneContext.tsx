import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Dimensions, Platform } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSequence,
  withDelay,
  runOnJS
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Spacing } from '@/constants/theme';

const MILESTONES = [25, 50, 75, 100];
const STORAGE_KEY = '@celebrated_milestones';

type CelebratedMilestones = Record<string, number[]>;

type MilestoneInfo = {
  goalId: string;
  goalName: string;
  milestone: number;
  isGoalComplete: boolean;
};

interface MilestoneContextType {
  celebrateMilestone: (info: MilestoneInfo) => void;
  checkAndCelebrateMilestones: (
    goalId: string,
    goalName: string,
    previousProgress: number,
    newProgress: number
  ) => void;
  getCelebratedMilestones: (goalId: string) => number[];
}

const MilestoneContext = createContext<MilestoneContextType | null>(null);

export function useMilestone() {
  const context = useContext(MilestoneContext);
  if (!context) {
    throw new Error('useMilestone must be used within MilestoneProvider');
  }
  return context;
}

export function MilestoneProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [celebratedMilestones, setCelebratedMilestones] = useState<CelebratedMilestones>({});
  const [currentCelebration, setCurrentCelebration] = useState<MilestoneInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const confettiRef = useRef<ConfettiCannon>(null);
  const celebrationQueue = useRef<MilestoneInfo[]>([]);
  const isProcessing = useRef(false);
  
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const iconScale = useSharedValue(0);

  useEffect(() => {
    loadCelebratedMilestones();
  }, []);

  const loadCelebratedMilestones = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCelebratedMilestones(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading celebrated milestones:', error);
    }
  };

  const saveCelebratedMilestones = async (data: CelebratedMilestones) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log('Error saving celebrated milestones:', error);
    }
  };

  const markMilestoneAsCelebrated = useCallback((goalId: string, milestone: number) => {
    setCelebratedMilestones(prev => {
      const goalMilestones = prev[goalId] || [];
      if (goalMilestones.includes(milestone)) return prev;
      
      const updated = {
        ...prev,
        [goalId]: [...goalMilestones, milestone],
      };
      saveCelebratedMilestones(updated);
      return updated;
    });
  }, []);

  const getCelebratedMilestones = useCallback((goalId: string): number[] => {
    return celebratedMilestones[goalId] || [];
  }, [celebratedMilestones]);

  const processNextCelebration = useCallback(() => {
    if (celebrationQueue.current.length === 0) {
      isProcessing.current = false;
      return;
    }

    const nextCelebration = celebrationQueue.current.shift()!;
    setCurrentCelebration(nextCelebration);
    setShowModal(true);

    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(1, { duration: 150 })
    );
    iconScale.value = withDelay(200, withSequence(
      withTiming(1.3, { duration: 200 }),
      withTiming(1, { duration: 150 })
    ));

    setTimeout(() => {
      if (confettiRef.current) {
        confettiRef.current.start();
      }
    }, 100);

    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.8, { duration: 300 });
      
      setTimeout(() => {
        setShowModal(false);
        setCurrentCelebration(null);
        markMilestoneAsCelebrated(nextCelebration.goalId, nextCelebration.milestone);
        
        setTimeout(() => {
          processNextCelebration();
        }, 300);
      }, 350);
    }, 2700);
  }, [opacity, scale, iconScale, markMilestoneAsCelebrated]);

  const celebrateMilestone = useCallback((info: MilestoneInfo) => {
    const celebrated = celebratedMilestones[info.goalId] || [];
    if (celebrated.includes(info.milestone)) return;
    
    celebrationQueue.current.push(info);
    
    if (!isProcessing.current) {
      isProcessing.current = true;
      processNextCelebration();
    }
  }, [celebratedMilestones, processNextCelebration]);

  const checkAndCelebrateMilestones = useCallback((
    goalId: string,
    goalName: string,
    previousProgress: number,
    newProgress: number
  ) => {
    const celebrated = celebratedMilestones[goalId] || [];
    
    for (const milestone of MILESTONES) {
      if (
        previousProgress < milestone && 
        newProgress >= milestone && 
        !celebrated.includes(milestone)
      ) {
        celebrateMilestone({
          goalId,
          goalName,
          milestone,
          isGoalComplete: milestone === 100,
        });
      }
    }
  }, [celebratedMilestones, celebrateMilestone]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const getMilestoneMessage = (milestone: number): string => {
    switch (milestone) {
      case 25:
        return 'Отличный старт! Четверть пути пройдена!';
      case 50:
        return 'Половина пути! Так держать!';
      case 75:
        return 'Финишная прямая! Осталось совсем немного!';
      case 100:
        return 'Поздравляем! Цель достигнута!';
      default:
        return 'Отличный прогресс!';
    }
  };

  const getMilestoneEmoji = (milestone: number): string => {
    switch (milestone) {
      case 25: return '🚀';
      case 50: return '🎯';
      case 75: return '🔥';
      case 100: return '🎉';
      default: return '⭐';
    }
  };

  const getMilestoneColor = (milestone: number): string => {
    switch (milestone) {
      case 25: return '#3B82F6';
      case 50: return '#8B5CF6';
      case 75: return '#F59E0B';
      case 100: return '#10B981';
      default: return '#3B82F6';
    }
  };

  return (
    <MilestoneContext.Provider value={{ 
      celebrateMilestone, 
      checkAndCelebrateMilestones,
      getCelebratedMilestones 
    }}>
      {children}
      
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          {currentCelebration && (
            <>
              <ConfettiCannon
                ref={confettiRef}
                count={150}
                origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
                autoStart={false}
                fadeOut
                fallSpeed={3000}
                explosionSpeed={350}
                colors={['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#06B6D4']}
              />
              
              <Animated.View 
                style={[
                  styles.celebrationCard, 
                  { backgroundColor: theme.backgroundDefault },
                  animatedCardStyle
                ]}
              >
                <Animated.View 
                  style={[
                    styles.emojiContainer,
                    { backgroundColor: getMilestoneColor(currentCelebration.milestone) + '20' },
                    animatedIconStyle
                  ]}
                >
                  <ThemedText style={styles.emoji}>
                    {getMilestoneEmoji(currentCelebration.milestone)}
                  </ThemedText>
                </Animated.View>
                
                <ThemedText style={[styles.milestonePercent, { color: getMilestoneColor(currentCelebration.milestone) }]}>
                  {currentCelebration.milestone}%
                </ThemedText>
                
                <ThemedText style={[styles.goalName, { color: theme.text }]} numberOfLines={1}>
                  {currentCelebration.goalName}
                </ThemedText>
                
                <ThemedText style={[styles.message, { color: theme.textSecondary }]}>
                  {getMilestoneMessage(currentCelebration.milestone)}
                </ThemedText>
                
                {currentCelebration.isGoalComplete && (
                  <View style={[styles.completeBadge, { backgroundColor: '#10B98120' }]}>
                    <Feather name="check-circle" size={16} color="#10B981" />
                    <ThemedText style={[styles.completeText, { color: '#10B981' }]}>
                      Цель достигнута!
                    </ThemedText>
                  </View>
                )}
              </Animated.View>
            </>
          )}
        </View>
      </Modal>
    </MilestoneContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    width: Dimensions.get('window').width - 64,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emoji: {
    fontSize: 40,
  },
  milestonePercent: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: Spacing.sm,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
    maxWidth: '90%',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
