import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAppStore from '../store/appStore.js';
import { getCollections, createCollection, deleteCollection, exportCollection, importCollection } from '../api/collections.js';
import { getRequestsByCollection, deleteRequest, createRequest } from '../api/requests.js';
import { showConfirm } from '../lib/showConfirm.jsx';
import { showToast } from '../store/toastStore.js';
import { useI18n } from '../i18n/useI18n.js';

// Сайдбар с деревом коллекций и навигацией
export default function Sidebar() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    collections,
    setCollections,
    setActiveRequest,
    favoriteRequestIds,
    toggleFavoriteRequest,
    collectionRequests,
    setCollectionRequests,
    addCollectionRequest,
    removeCollectionRequest,
  } = useAppStore();
  const [expanded, setExpanded] = useState({});
  const [newColName, setNewColName] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const importRef = useRef(null); // скрытый input для импорта файла

  // Импорт коллекции из JSON-файла
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await importCollection(json);
      setCollections([res.data.data, ...collections]);
    } catch (err) {
      showToast(`${t('importFailed', 'Import failed')}: ${err.response?.data?.message || err.message}`, 'error');
    }
    // Сбрасываем input чтобы можно было импортировать тот же файл повторно
    e.target.value = '';
  };

  useEffect(() => {
    getCollections()
      .then((res) => setCollections(res.data.data))
      .catch(console.error);
  }, []);

  const toggleCollection = async (col) => {
    const isOpen = expanded[col.id];
    setExpanded((prev) => ({ ...prev, [col.id]: !isOpen }));
    if (!isOpen && collectionRequests[col.id] === undefined) {
      try {
        const res = await getRequestsByCollection(col.id);
        setCollectionRequests(col.id, res.data.data);
      } catch (e) { console.error(e); }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    try {
      const res = await createCollection({ name: newColName.trim() });
      setCollections([res.data.data, ...collections]);
      setNewColName('');
      setAdding(false);
    } catch (e) { console.error(e); }
  };

  const handleDeleteCol = async (e, id) => {
    e.stopPropagation();
    if (!await showConfirm(t('deleteCollectionConfirm', 'All requests inside this folder will be removed permanently.'), {
      title: t('deleteCollection', 'Delete collection'),
      confirmLabel: t('delete', 'Delete'),
    })) return;
    try {
      await deleteCollection(id);
      setCollections(collections.filter((c) => c.id !== id));
    } catch (e) { console.error(e); }
  };

  const openRequest = (req) => {
    setActiveRequest({
      id: req.id,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: JSON.parse(req.headers || '{}'),
      queryParams: JSON.parse(req.queryParams || '{}'),
      body: req.body || '',
      localVariables: {},
      collectionId: req.collectionId,
    });
    // Если мы не на главной — переходим туда
    if (location.pathname !== '/') navigate('/');
  };

  const handleDeleteReq = async (e, colId, reqId) => {
    e.stopPropagation();
    if (!await showConfirm(t('deleteRequestConfirm', 'This cannot be undone.'), {
      title: t('deleteRequest', 'Delete request'),
      confirmLabel: t('delete', 'Delete'),
    })) return;
    try {
      await deleteRequest(reqId);
      removeCollectionRequest(colId, reqId);
    } catch (e) { console.error(e); }
  };

  const handleDuplicateReq = async (e, colId, req) => {
    e.stopPropagation();
    try {
      const res = await createRequest({
        name: `${req.name} ${t('copySuffix', 'Copy')}`,
        method: req.method,
        url: req.url,
        headers: JSON.parse(req.headers || '{}'),
        queryParams: JSON.parse(req.queryParams || '{}'),
        body: req.body || '',
        collectionId: colId,
      });
      addCollectionRequest(colId, res.data.data);
      showToast(t('requestDuplicated', 'Request duplicated'), 'success');
    } catch (error) {
      showToast(t('failedDuplicateRequest', 'Failed to duplicate request'), 'error');
    }
  };

  const methodColor = { GET: '#7eb8f7', POST: '#6ee7b7', PUT: '#fbbf77', DELETE: '#f87171', PATCH: '#67e8f9' };

  return (
    <aside className="sidebar">
      {/* Верхняя навигация */}
      <nav className="sidebar-nav" aria-label="Main">
        <button
          type="button"
          className={`sidebar-nav-btn ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <svg className="sidebar-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
            <path d="M14 2v6h6M10 13h4M10 17h8" strokeLinecap="round" />
          </svg>
          {t('requests', 'Requests')}
        </button>
        <div className="sidebar-nav-rule" aria-hidden />
        <button
          type="button"
          className={`sidebar-nav-btn ${location.pathname === '/environments' ? 'active' : ''}`}
          onClick={() => navigate('/environments')}
        >
          <svg className="sidebar-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" strokeLinecap="round" />
          </svg>
          {t('environments', 'Environments')}
        </button>
        <div className="sidebar-nav-rule" aria-hidden />
        <button
          type="button"
          className={`sidebar-nav-btn ${location.pathname === '/history' ? 'active' : ''}`}
          onClick={() => navigate('/history')}
        >
          <svg className="sidebar-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('history', 'History')}
        </button>
        <div className="sidebar-nav-rule" aria-hidden />
        <button
          type="button"
          className={`sidebar-nav-btn ${location.pathname === '/load-testing' ? 'active' : ''}`}
          onClick={() => navigate('/load-testing')}
        >
          <svg className="sidebar-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M3 16h3l2-6 3 9 3-7 2 4h5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 20h18" strokeLinecap="round" />
          </svg>
          {t('loadTesting', 'Load Testing')}
        </button>
      </nav>

      <div className="sidebar-divider" />

      {/* Заголовок коллекций */}
      <div className="sidebar-header">
        <span>{t('collections', 'Collections')}</span>
        <div className="sidebar-header-actions">
          <button className="btn-icon" onClick={() => importRef.current?.click()} title={t('importCollection', 'Import collection')}>↑</button>
          <button className="btn-icon" onClick={() => setAdding((v) => !v)} title={t('newCollection', 'New collection')}>+</button>
        </div>
      </div>
      <div className="sidebar-search-wrap">
        <input
          className="sidebar-search"
          placeholder={t('searchRequests', 'Search requests or URL')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {/* Скрытый input для выбора файла импорта */}
      <input
        ref={importRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {adding && (
        <form className="new-col-form" onSubmit={handleCreate}>
          <input
            autoFocus
            placeholder={t('collectionName', 'Collection name')}
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
          />
          <button type="submit" className="btn-col-add">{t('add', 'Add')}</button>
        </form>
      )}

      <ul className="collection-list">
        {collections.map((col) => (
          <li key={col.id}>
            <div className="col-item" onClick={() => toggleCollection(col)}>
              <span className="col-arrow">{expanded[col.id] ? '▾' : '▸'}</span>
              <span className="col-name">{col.name}</span>
              <button
                className="btn-icon"
                title={t('exportCollection', 'Export collection')}
                onClick={(e) => { e.stopPropagation(); exportCollection(col.id, col.name); }}
              >↓</button>
              <button className="btn-icon danger" onClick={(e) => handleDeleteCol(e, col.id)}>✕</button>
            </div>
            <div className={`request-list-wrap ${expanded[col.id] ? 'expanded' : ''}`}>
              <ul className="request-list">
                {(collectionRequests[col.id] || [])
                  .filter((req) => {
                    const query = searchTerm.trim().toLowerCase();
                    if (!query) return true;
                    return req.name.toLowerCase().includes(query) || req.url.toLowerCase().includes(query);
                  })
                  .sort((a, b) => {
                    const aFav = favoriteRequestIds.includes(a.id) ? 1 : 0;
                    const bFav = favoriteRequestIds.includes(b.id) ? 1 : 0;
                    return bFav - aFav;
                  })
                  .map((req) => (
                  <li key={req.id} className="req-item" onClick={() => openRequest(req)}>
                    <button
                      type="button"
                      className={`btn-icon ${favoriteRequestIds.includes(req.id) ? 'active-star' : ''}`}
                      title={t('favorite', 'Favorite')}
                      onClick={(e) => { e.stopPropagation(); toggleFavoriteRequest(req.id); }}
                    >
                      ★
                    </button>
                    <span className="method-badge" style={{ color: methodColor[req.method] || '#ccc' }}>
                      {req.method}
                    </span>
                    <span className="req-name">{req.name}</span>
                    <div className="req-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon"
                        title={t('duplicateRequest', 'Duplicate request')}
                        onClick={(e) => handleDuplicateReq(e, col.id, req)}
                      >⎘</button>
                      <button
                        className="btn-icon"
                        title={t('testScripts', 'Test scripts')}
                        onClick={(e) => { e.stopPropagation(); navigate(`/test-scripts/${req.id}`); }}
                      >⚗</button>
                      <button className="btn-icon danger" onClick={(e) => handleDeleteReq(e, col.id, req.id)}>✕</button>
                    </div>
                  </li>
                ))}
                {(collectionRequests[col.id] || []).length === 0 && (
                  <li className="req-empty">{t('noRequests', 'No requests')}</li>
                )}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
