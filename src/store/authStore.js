import { create } from 'zustand';
import { mockUsers } from '../data/mockData';

const stored = localStorage.getItem('harbored_user');

export const useAuthStore = create((set) => ({
  user: stored ? JSON.parse(stored) : null,
  login: (email, password) => {
    const found = mockUsers.find(u => u.email === email && u.password === password);
    if (found) {
      localStorage.setItem('harbored_user', JSON.stringify(found));
      set({ user: found });
      return true;
    }
    return false;
  },
  logout: () => {
    localStorage.removeItem('harbored_user');
    set({ user: null });
  },
  demoLogin: () => {
    const user = mockUsers[0];
    localStorage.setItem('harbored_user', JSON.stringify(user));
    set({ user });
  },
}));
