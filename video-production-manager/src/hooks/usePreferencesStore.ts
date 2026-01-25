/**
 * App Preferences Store
 * Stores user-specific UI preferences (not synced across users)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserRole = 'admin' | 'manager' | 'operator';

interface PreferencesState {
  // UI Preferences
  theme: 'light' | 'dark';
  accentColor: string;
  activeTab: string;
  collapsedCategories: string[];
  
  // User Role
  userRole: UserRole;
  
  // Window/Layout State
  sidebarCollapsed: boolean;
  lastOpenedProjectId?: string;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  setActiveTab: (tab: string) => void;
  toggleCategoryCollapsed: (category: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLastOpenedProjectId: (id: string) => void;
  setUserRole: (role: UserRole) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Initial State
      theme: 'dark',
      accentColor: '#3b82f6',
      activeTab: 'dashboard',
      collapsedCategories: [],
      sidebarCollapsed: false,
      lastOpenedProjectId: undefined,
      userRole: 'operator' as UserRole, // Default role

      // Actions
      setTheme: (theme) => set({ theme }),
      
      setAccentColor: (accentColor) => set({ accentColor }),
      
      setActiveTab: (activeTab) => set({ activeTab }),
      
      toggleCategoryCollapsed: (category) =>
        set((state) => ({
          collapsedCategories: state.collapsedCategories.includes(category)
            ? state.collapsedCategories.filter((c) => c !== category)
            : [...state.collapsedCategories, category],
        })),
      
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      
      setLastOpenedProjectId: (lastOpenedProjectId) => set({ lastOpenedProjectId }),
      
      setUserRole: (userRole) => set({ userRole }),
    }),
    {
      name: 'app-preferences',
    }
  )
);
