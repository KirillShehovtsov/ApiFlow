import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore.js';
import useAppStore from './store/appStore.js';
import ToastHost from './components/ToastHost.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MainPage from './pages/MainPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import EnvironmentsPage from './pages/EnvironmentsPage.jsx';
import TestScriptsPage from './pages/TestScriptsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoadTestingPage from './pages/LoadTestingPage.jsx';

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <ToastHost />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><MainPage /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
        <Route path="/environments" element={<PrivateRoute><EnvironmentsPage /></PrivateRoute>} />
        <Route path="/load-testing" element={<PrivateRoute><LoadTestingPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/test-scripts/:requestId" element={<PrivateRoute><TestScriptsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
