import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  login: () => {
    localStorage.setItem('harbored_loggedin', 'true');
    set({ user: { name: 'Liam Carney', email: 'liamcarney21@gmail.com' } });
    return true;
  },
  logout: () => {
    localStorage.removeItem('harbored_loggedin');
    set({ user: null });
  },
}));
