import { create } from 'zustand';

const getStoredTheme = () => {
  try {
    const value = localStorage.getItem('apiflow-theme');
    return value === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

const getStoredFavorites = () => {
  try {
    const raw = localStorage.getItem('apiflow-favorite-request-ids');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getStoredLocale = () => {
  try {
    const value = localStorage.getItem('apiflow-locale');
    return value === 'en' ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
};

// Главный стор приложения — коллекции, активный запрос, окружения
const useAppStore = create((set) => ({
  // --- UI preferences ---
  theme: getStoredTheme(),
  setTheme: (theme) => {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    try {
      localStorage.setItem('apiflow-theme', nextTheme);
    } catch {
      // ignore storage errors
    }
    set({ theme: nextTheme });
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('apiflow-theme', nextTheme);
      } catch {
        // ignore storage errors
      }
      return { theme: nextTheme };
    }),
  locale: getStoredLocale(),
  setLocale: (locale) => {
    const nextLocale = locale === 'en' ? 'en' : 'ru';
    try {
      localStorage.setItem('apiflow-locale', nextLocale);
    } catch {
      // ignore storage errors
    }
    set({ locale: nextLocale });
  },
  toggleLocale: () =>
    set((state) => {
      const nextLocale = state.locale === 'ru' ? 'en' : 'ru';
      try {
        localStorage.setItem('apiflow-locale', nextLocale);
      } catch {
        // ignore storage errors
      }
      return { locale: nextLocale };
    }),

  // --- Коллекции ---
  collections: [],
  setCollections: (collections) => set({ collections }),
  collectionRequests: {},
  setCollectionRequests: (collectionId, list) =>
    set((state) => ({
      collectionRequests: { ...state.collectionRequests, [collectionId]: list },
    })),
  addCollectionRequest: (collectionId, request) =>
    set((state) => ({
      collectionRequests: {
        ...state.collectionRequests,
        [collectionId]: [request, ...(state.collectionRequests[collectionId] || [])],
      },
    })),
  updateCollectionRequest: (collectionId, requestId, patch) =>
    set((state) => {
      const list = state.collectionRequests[collectionId];
      if (!list) return state;
      return {
        collectionRequests: {
          ...state.collectionRequests,
          [collectionId]: list.map((item) =>
            (item.id === requestId ? { ...item, ...patch } : item)),
        },
      };
    }),
  removeCollectionRequest: (collectionId, requestId) =>
    set((state) => {
      const list = state.collectionRequests[collectionId];
      if (!list) return state;
      return {
        collectionRequests: {
          ...state.collectionRequests,
          [collectionId]: list.filter((item) => item.id !== requestId),
        },
      };
    }),
  favoriteRequestIds: getStoredFavorites(),
  toggleFavoriteRequest: (requestId) =>
    set((state) => {
      const id = Number(requestId);
      if (!Number.isFinite(id)) return state;
      const exists = state.favoriteRequestIds.includes(id);
      const favoriteRequestIds = exists
        ? state.favoriteRequestIds.filter((item) => item !== id)
        : [...state.favoriteRequestIds, id];
      try {
        localStorage.setItem('apiflow-favorite-request-ids', JSON.stringify(favoriteRequestIds));
      } catch {
        // ignore storage errors
      }
      return { favoriteRequestIds };
    }),

  // --- Активный запрос в редакторе ---
  activeRequest: {
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: {},
    queryParams: {},
    localVariables: {},
    body: '',
  },
  setActiveRequest: (req) => set({ activeRequest: req }),
  updateActiveRequest: (patch) =>
    set((state) => ({ activeRequest: { ...state.activeRequest, ...patch } })),

  // --- Ответ сервера ---
  response: null,
  setResponse: (response) => set({ response }),

  // --- Загрузка (пока идёт запрос) ---
  loading: false,
  setLoading: (loading) => set({ loading }),

  // --- Окружения ---
  environments: [],
  setEnvironments: (environments) => set({ environments }),
  activeEnvironmentId: null,
  setActiveEnvironmentId: (id) => set({ activeEnvironmentId: id }),
}));

export default useAppStore;
