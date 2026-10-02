import { useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import RequestEditor from '../components/RequestEditor.jsx';
import ResponsePanel from '../components/ResponsePanel.jsx';
import { getEnvironments } from '../api/environments.js';
import { getProfile } from '../api/auth.js';
import useAppStore from '../store/appStore.js';
import useAuthStore from '../store/authStore.js';

// Главная страница — трёхколоночный layout
export default function MainPage() {
  const setEnvironments = useAppStore((s) => s.setEnvironments);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // Загружаем профиль и окружения при старте
    getProfile().then((res) => setUser(res.data.data)).catch(console.error);
    getEnvironments().then((res) => setEnvironments(res.data.data)).catch(console.error);
  }, []);

  return (
    <div className="app-layout">
      <Navbar />
      <div className="main-content">
        <Sidebar />
        <div className="editor-area">
          <RequestEditor />
          <ResponsePanel />
        </div>
      </div>
    </div>
  );
}
