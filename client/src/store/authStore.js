import { create } from 'zustand';

// Стор авторизации — хранит токен и данные пользователя
const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: null,

  // Сохраняем токен и пользователя после логина/регистрации
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user });
  },

  // Очищаем всё при выходе
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
