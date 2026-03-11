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
  collapsedCategories: string[]; // legacy — kept for migration compat
  // Per-project checklist expand state. Key = productionId.
  // Value = array of EXPANDED category keys. Absent/empty = all collapsed (default).
  expandedCategoriesByProject: Record<string, string[]>;
  
  // User Role
  userRole: UserRole;
  
  // Window/Layout State
  sidebarCollapsed: boolean;
  lastOpenedProjectId?: string;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  setActiveTab: (tab: string) => void;
  toggleCategoryCollapsed: (category: string) => void; // legacy
  toggleCategoryExpandedForProject: (projectId: string, category: string) => void;
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
      expandedCategoriesByProject: {},
      sidebarCollapsed: false,
      lastOpenedProjectId: undefined,
      userRole: 'operator' as UserRole, // Default role

      // Actions
      setTheme: (theme) => set({ theme }),
      
      setAccentColor: (accentColor) => set({ accentColor }),
      
      setActiveTab: (activeTab) => set({ activeTab }),
      
      // legacy — no longer used by Checklist page
      toggleCategoryCollapsed: (category) =>
        set((state) => ({
          collapsedCategories: state.collapsedCategories.includes(category)
            ? state.collapsedCategories.filter((c) => c !== category)
            : [...state.collapsedCategories, category],
        })),
      
      // Per-project: toggle a category between expanded and collapsed.
      // An absent/empty array means all categories are collapsed (the default).
      toggleCategoryExpandedForProject: (projectId, category) =>
        set((state) => {
          const current = state.expandedCategoriesByProject[projectId] ?? [];
          const updated = current.includes(category)
            ? current.filter((c) => c !== category)   // expanded → collapse
            : [...current, category];                  // collapsed → expand
          return {
            expandedCategoriesByProject: {
              ...state.expandedCategoriesByProject,
              [projectId]: updated,
            },
          };
        }),
      
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      
      setLastOpenedProjectId: (lastOpenedProjectId) => set({ lastOpenedProjectId }),
      
      setUserRole: (userRole) => set({ userRole }),
    }),
    {
      name: 'app-preferences',
    }
  )
);
