/**
 * Simple user identification (no authentication required)
 * Uses localStorage to persist user ID and name
 */

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function getCurrentUserId(): string {
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_id', userId);
  }
  return userId;
}

export function getCurrentUserName(): string {
  let userName = localStorage.getItem('user_name');
  if (!userName) {
    userName = prompt('👋 Welcome! What\'s your name?') || 'Anonymous';
    localStorage.setItem('user_name', userName);
  }
  return userName;
}

export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AN';
}

export function getUserColor(userId: string): string {
  // Generate consistent color based on user ID
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export interface UserInfo {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export function getCurrentUser(): UserInfo {
  const id = getCurrentUserId();
  const name = getCurrentUserName();
  return {
    id,
    name,
    initials: getUserInitials(name),
    color: getUserColor(id),
  };
}
