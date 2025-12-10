import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER: '@local_user',
  GOALS: '@local_goals',
  SHIFTS: '@local_shifts',
  GOAL_ALLOCATIONS: '@local_goal_allocations',
  HAS_LOCAL_DATA: '@has_local_data',
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface LocalUser {
  id: string;
  username: string;
  balance: number;
  createdAt: string;
}

export interface LocalGoal {
  id: string;
  userId: string;
  name: string;
  iconKey: string;
  iconColor: string;
  iconBgColor: string;
  targetAmount: number;
  currentAmount: number;
  status: 'active' | 'completed' | 'hidden';
  isPrimary: boolean;
  orderIndex: number;
  allocationPercentage: number;
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalShift {
  id: string;
  userId: string;
  operationType: 'returns' | 'receiving';
  shiftType: 'day' | 'night';
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'no_show';
  earnings: number | null;
  earningsRecordedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalGoalAllocation {
  id: string;
  shiftId: string;
  goalId: string;
  amount: number;
  createdAt: string;
}

const LOCAL_USER_ID = 'local-user-00000000';

export const localStorageService = {
  async getUser(): Promise<LocalUser> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('[LocalStorage] Error reading user:', error);
    }
    
    const newUser: LocalUser = {
      id: LOCAL_USER_ID,
      username: 'local_user',
      balance: 0,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    return newUser;
  },

  async updateUser(updates: Partial<LocalUser>): Promise<LocalUser> {
    const user = await this.getUser();
    const updatedUser = { ...user, ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    if (updates.balance !== undefined) {
      await this.markHasLocalData();
    }
    return updatedUser;
  },

  async getGoals(): Promise<LocalGoal[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('[LocalStorage] Error reading goals:', error);
    }
    return [];
  },

  async createGoal(goal: Omit<LocalGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<LocalGoal> {
    const goals = await this.getGoals();
    const now = new Date().toISOString();
    const newGoal: LocalGoal = {
      ...goal,
      id: generateUUID(),
      userId: LOCAL_USER_ID,
      createdAt: now,
      updatedAt: now,
    };
    goals.push(newGoal);
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    await this.markHasLocalData();
    return newGoal;
  },

  async updateGoal(id: string, updates: Partial<LocalGoal>): Promise<LocalGoal | null> {
    const goals = await this.getGoals();
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) return null;
    
    goals[index] = { 
      ...goals[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    await this.markHasLocalData();
    return goals[index];
  },

  async deleteGoal(id: string): Promise<boolean> {
    const goals = await this.getGoals();
    const filtered = goals.filter(g => g.id !== id);
    if (filtered.length === goals.length) return false;
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(filtered));
    return true;
  },

  async getShifts(): Promise<LocalShift[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SHIFTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('[LocalStorage] Error reading shifts:', error);
    }
    return [];
  },

  async createShift(shift: Omit<LocalShift, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<LocalShift> {
    const shifts = await this.getShifts();
    const now = new Date().toISOString();
    const newShift: LocalShift = {
      ...shift,
      id: generateUUID(),
      userId: LOCAL_USER_ID,
      createdAt: now,
      updatedAt: now,
    };
    shifts.push(newShift);
    await AsyncStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    await this.markHasLocalData();
    return newShift;
  },

  async updateShift(id: string, updates: Partial<LocalShift>): Promise<LocalShift | null> {
    const shifts = await this.getShifts();
    const index = shifts.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    shifts[index] = { 
      ...shifts[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    await AsyncStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    await this.markHasLocalData();
    return shifts[index];
  },

  async deleteShift(id: string): Promise<boolean> {
    const shifts = await this.getShifts();
    const filtered = shifts.filter(s => s.id !== id);
    if (filtered.length === shifts.length) return false;
    await AsyncStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(filtered));
    return true;
  },

  async getGoalAllocations(): Promise<LocalGoalAllocation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GOAL_ALLOCATIONS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('[LocalStorage] Error reading allocations:', error);
    }
    return [];
  },

  async createGoalAllocation(allocation: Omit<LocalGoalAllocation, 'id' | 'createdAt'>): Promise<LocalGoalAllocation> {
    const allocations = await this.getGoalAllocations();
    const newAllocation: LocalGoalAllocation = {
      ...allocation,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    allocations.push(newAllocation);
    await AsyncStorage.setItem(STORAGE_KEYS.GOAL_ALLOCATIONS, JSON.stringify(allocations));
    await this.markHasLocalData();
    return newAllocation;
  },

  async hasLocalData(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(STORAGE_KEYS.HAS_LOCAL_DATA);
      if (flag === 'true') {
        const goals = await this.getGoals();
        const shifts = await this.getShifts();
        return goals.length > 0 || shifts.length > 0;
      }
    } catch (error) {
      console.log('[LocalStorage] Error checking local data:', error);
    }
    return false;
  },

  async markHasLocalData(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_LOCAL_DATA, 'true');
  },

  async getAllLocalData(): Promise<{
    user: LocalUser;
    goals: LocalGoal[];
    shifts: LocalShift[];
    allocations: LocalGoalAllocation[];
  }> {
    const [user, goals, shifts, allocations] = await Promise.all([
      this.getUser(),
      this.getGoals(),
      this.getShifts(),
      this.getGoalAllocations(),
    ]);
    return { user, goals, shifts, allocations };
  },

  async clearAllLocalData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER,
      STORAGE_KEYS.GOALS,
      STORAGE_KEYS.SHIFTS,
      STORAGE_KEYS.GOAL_ALLOCATIONS,
      STORAGE_KEYS.HAS_LOCAL_DATA,
    ]);
    console.log('[LocalStorage] All local data cleared');
  },
};
