import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import MapComponent from './components/MapComponent';
import SearchBar from './components/SearchBar';
import AuthForm from './components/AuthForm';
import AdminDashboard from './components/AdminDashboard';
// import RequestModal from './components/RequestModal'; // Đã comment lại vì logic mới dùng CreateStoreModal
import LayerSwitcher from './components/LayerSwitcher';
import LocationPanel from './components/LocationPanel';
import FloatingControls from './components/FloatingControls';
import { IoPersonCircle, IoSettingsSharp, IoAddCircle } from 'react-icons/io5';
import CreateStoreModal from './components/CreateStoreModal';
import UserProfileModal from './components/UserProfileModal';

import './App.css';

const MainApp = () => {
  const { currentUser, logout, authFetch } = useAuth();
  
  // --- States quản lý dữ liệu ---
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // --- States quản lý giao diện (Modal/Panel) ---
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false); // State bật/tắt Modal tạo mới
  const [selectedStore, setSelectedStore] = useState(null); // Panel chi tiết quán

  // --- States bản đồ & bộ lọc ---
  const [mapType, setMapType] = useState('standard');
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [selectingMode, setSelectingMode] = useState(null); // 'start' hoặc 'end' (để tìm đường)
  const [filterType, setFilterType] = useState('all');

  const [showProfileModal, setShowProfileModal] = useState(false);

  // 1. Tải danh sách yêu thích (Dùng useCallback để tránh warning)
  const fetchFavorites = useCallback(() => {
    if (!currentUser) { 
        setFavorites([]); 
        return; 
    }
    authFetch('http://127.0.0.1:8000/api/favorites/')
      .then(res => res.json())
      .then(data => {
        const results = Array.isArray(data) ? data : (data.results || []);
        setFavorites(results);
      })
      .catch(err => console.error("Lỗi tải yêu thích:", err));
  }, [currentUser, authFetch]);

  // Gọi fetchFavorites khi user thay đổi
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // 2. Tải dữ liệu Cửa hàng & Danh mục
  useEffect(() => {
    // Tải danh mục
    fetch('http://127.0.0.1:8000/api/categories/')
      .then(res => res.json())
      .then(data => setCategories(data.results || data))
      .catch(err => console.error(err));

    // Tải danh sách cửa hàng
    fetchStoreData();
  }, []);

  const fetchStoreData = () => {
    fetch('http://127.0.0.1:8000/api/stores/')
      .then(res => res.json())
      .then(data => {
        let features = [];
        if (data.features) features = data.features;
        else if (data.results && data.results.features) features = data.results.features;
        else if (data.results && Array.isArray(data.results)) features = data.results;

        if (!features) return;

        const formattedStores = features.map(feature => ({
          id: feature.id || feature.properties.id,
          name: feature.properties.name,
          category: feature.properties.category,
          category_name: feature.properties.category_detail?.name,
          address: feature.properties.address,
          images: feature.properties.images,
          rating_avg: feature.properties.rating_avg,
          rating_count: feature.properties.rating_count,
          open_time: feature.properties.open_time,
          close_time: feature.properties.close_time,
          state: feature.properties.state,
          lng: feature.geometry.coordinates[0], 
          lat: feature.geometry.coordinates[1],
          type: feature.properties.category,
          describe: feature.properties.describe,
          note: feature.properties.note // Nếu backend có trả về note
        }));
        setStores(formattedStores);
      })
      .catch(err => console.error("Lỗi tải data:", err));
  };

  // 3. Xử lý Thêm/Xóa Yêu thích
  const handleToggleFavorite = async (storeId) => {
    if (!currentUser) {
        alert("Vui lòng đăng nhập để lưu địa điểm này!");
        setShowAuthForm(true);
        return;
    }

    const existingFav = favorites.find(f => f.store === storeId);

    if (existingFav) {
        // Xóa tim
        const res = await authFetch(`http://127.0.0.1:8000/api/favorites/${existingFav.id}/`, { method: 'DELETE' });
        if (res.ok) setFavorites(prev => prev.filter(f => f.id !== existingFav.id));
    } else {
        // Thêm tim
        const res = await authFetch(`http://127.0.0.1:8000/api/favorites/`, {
            method: 'POST', body: JSON.stringify({ store: storeId })
        });
        if (res.ok) {
            const newFav = await res.json();
            setFavorites(prev => [...prev, newFav]);
        }
    }
  };

  // 4. Xử lý Click trên bản đồ (Chỉ dùng để chọn điểm đi/đến, KHÔNG dùng để thêm quán nữa)
  const handleMapClick = (coords) => {
    if (selectedStore) { setSelectedStore(null); return; }
    if (selectingMode === 'start') { setStartPoint(coords); setSelectingMode(null); return; }
    if (selectingMode === 'end') { setEndPoint(coords); setSelectingMode(null); return; }
  };

  // 5. Xử lý Click nút "Thêm cửa hàng mới"
  const handleToggleAddMode = () => {
    if (!currentUser) {
      alert("Bạn cần đăng nhập để tạo cửa hàng mới!");
      setShowAuthForm(true);
    } else {
      // Mở Modal ngay lập tức
      setShowCreateStoreModal(true);
      // Đóng các panel khác cho gọn
      setSelectedStore(null);
    }
  };

  const handleStoreClick = (storeData) => {
    setSelectingMode(null);
    setSelectedStore(storeData);
  };

  // 6. Logic lọc hiển thị
  const displayedStores = stores.filter(store => {
    if (filterType === 'favorites') {
        if (!currentUser) return false;
        const favStoreIds = favorites.map(f => f.store);
        return favStoreIds.includes(store.id);
    }
    if (filterType === 'all') return true;
    return store.category === parseInt(filterType);
  });

  return (
    <div className="app-container">
      <MapComponent 
        mapType={mapType}
        selectingMode={selectingMode}
        startPoint={startPoint}
        endPoint={endPoint}
        onMapClick={handleMapClick}
        onStoreClick={handleStoreClick}
        stores={displayedStores}
      />
      
      <div className="ui-overlay">
        {/* Góc Trái Trên: Tìm kiếm & Bộ lọc */}
        <div className="top-left-area">
          <SearchBar 
             startPoint={startPoint} endPoint={endPoint}
             onFocusStart={() => setSelectingMode('start')}
             onFocusEnd={() => setSelectingMode('end')}
             isSelecting={selectingMode}
          />
          <FloatingControls 
            categories={categories}
            currentFilter={filterType}
            onFilterChange={setFilterType}
            currentUser={currentUser}
          />
        </div>

        {/* Góc Phải Trên: User & Nút Thêm */}
        <div className="top-right-user">
          {currentUser ? (
            <div className="user-badge">
              <span onClick={() => setShowProfileModal(true)} style={{cursor: 'pointer'}}>
                 {/* Nếu có avatar thì hiện avatar nhỏ, không thì icon */}
                 {currentUser.avatar ? (
                     <img src={currentUser.avatar} alt="avt" style={{width: 30, height: 30, borderRadius: '50%', verticalAlign: 'middle', marginRight: 5}}/>
                 ) : (
                     <IoPersonCircle size={24} style={{verticalAlign: 'middle', marginRight: 5}}/>
                 )}
                 Xin chào, <strong>{currentUser.last_name} {currentUser.first_name}</strong>
              </span>
              {currentUser.role === 'admin' && (
                <button className="icon-btn" title="Quản trị" onClick={() => setShowAdminPanel(true)}>
                  <IoSettingsSharp size={20} />
                </button>
              )}
              <button className="icon-btn" title="Thêm địa điểm" onClick={handleToggleAddMode}>
                <IoAddCircle size={20} color="#5F6368" />
              </button>
              <button className="btn-logout" onClick={logout}>Đăng xuất</button>
            </div>
          ) : (
            <div className="guest-controls" style={{ display: 'flex', gap: '10px' }}>
               <button className="icon-btn" title="Thêm địa điểm" onClick={handleToggleAddMode}>
                 <IoAddCircle size={20} color="#5F6368" />
              </button>
              <button className="btn-login" onClick={() => setShowAuthForm(true)}>
                <IoPersonCircle size={20} /> Đăng nhập
              </button>
            </div>
          )}
        </div>

        {/* Góc Trái Dưới: Đổi lớp bản đồ */}
        <div className="bottom-left-area">
           <LayerSwitcher currentType={mapType} onSwitch={setMapType} />
        </div>

        {/* --- CÁC PANEL & MODAL --- */}
        
        {/* Panel Chi tiết Quán */}
        {selectedStore && (
            <LocationPanel 
                location={selectedStore} 
                onClose={() => setSelectedStore(null)}
                isFavorite={favorites.some(f => f.store === selectedStore.id)}
                onToggleFavorite={() => handleToggleFavorite(selectedStore.id)}
            />
        )}

        {/* Form Đăng nhập */}
        {showAuthForm && <AuthForm onClose={() => setShowAuthForm(false)} />}
        
        {/* Dashboard Admin */}
        {showAdminPanel && <AdminDashboard onClose={() => setShowAdminPanel(false)} />}
        
        {/* Modal Thêm Cửa Hàng Mới */}
        {showCreateStoreModal && (
            <CreateStoreModal 
                onClose={() => setShowCreateStoreModal(false)} 
            />
        )}
        {showProfileModal && <UserProfileModal onClose={() => setShowProfileModal(false)} />};
      </div>
    </div>
    
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
  
}

export default App;