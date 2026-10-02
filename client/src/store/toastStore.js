import { create } from 'zustand';

let nextId = 0;

const DEFAULT_DURATION_MS = 4800;

const useToastStore = create((set) => ({
  toasts: [],
  pushToast: ({ message, variant = 'info', duration = DEFAULT_DURATION_MS }) => {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
    return id;
  },
  dismissToast: (toastId) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== toastId) })),
}));

export function showToast(message, variant = 'info') {
  return useToastStore.getState().pushToast({ message, variant });
}

export default useToastStore;
