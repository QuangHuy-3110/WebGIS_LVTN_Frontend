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
  const [waypoints, setWaypoints] = useState([]); // Mảng các điểm dừng
  const [selectingMode, setSelectingMode] = useState(null); // 'start' hoặc 'end' (để tìm đường)
  const [activeFilters, setActiveFilters] = useState([]); // [] means 'all'
  const [currentLocation, setCurrentLocation] = useState(null); // [lng, lat]

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [triggerFlyTo, setTriggerFlyTo] = useState(0);
  const [routeInstructions, setRouteInstructions] = useState([]);
  const [activeRouteStep, setActiveRouteStep] = useState(null);
  const [showStandaloneRoute, setShowStandaloneRoute] = useState(true);

  const [appLoading, setAppLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Check if any route point is an actual store
  const routeHasStore = React.useMemo(() => {
    if (!startPoint && !endPoint && waypoints.length === 0) return false;
    const allRoutePoints = [];
    if (startPoint) allRoutePoints.push(startPoint);
    if (endPoint) allRoutePoints.push(endPoint);
    waypoints.forEach(wp => allRoutePoints.push(wp));

    return stores.some(store => 
      allRoutePoints.some(pt => pt[0] === store.lng && pt[1] === store.lat)
    );
  }, [startPoint, endPoint, waypoints, stores]);

  // Hiển thị Animation loading ban đầu
  useEffect(() => {
    // Để loading screen hiển thị trong khoảng 1 giây
    const timer = setTimeout(() => {
      setIsFadingOut(true); // Bắt đầu hiệu ứng mờ dần
      // Chờ CSS transition (1s) xong thì mới unmount
      setTimeout(() => setAppLoading(false), 1000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Theo dõi vị trí hiện tại qua Geolocation API
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        const coords = [lng, lat];
        setCurrentLocation(coords);
        // Lần đầu tiên nhận được vị trí → tự động set điểm đi nếu chưa có
        setStartPoint(prev => prev === null ? coords : prev);
      },
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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

  const handleDirections = (store) => {
    // 1. Set Điểm đến là tọa độ của quán đang xem
    setEndPoint([store.lng, store.lat]);

    // 2. Set Điểm đi là null (để người dùng chọn) hoặc vị trí GPS nếu muốn
    setStartPoint(null);
    setWaypoints([]); // Xoá điểm dừng cũ nếu có

    // 3. Chuyển bản đồ sang chế độ chờ người dùng chọn Điểm đi
    setSelectingMode('start');

    // 4. Đóng Panel thông tin quán để lộ bản đồ ra
    setSelectedStore(null);

    // 5. (Tuỳ chọn) Thông báo nhắc người dùng
    // alert(`Đã chọn đích đến là "${store.name}".\nVui lòng chạm vào bản đồ để chọn vị trí xuất phát của bạn!`);
  };

  const getAvatarUrl = (url) => {
    if (!url) return null;
    // Nếu đường dẫn đã có http (ví dụ ảnh Google/Facebook) thì giữ nguyên
    if (url.startsWith('http') || url.startsWith('https')) {
      return url;
    }
    // Nếu là đường dẫn tương đối từ Django (/media/...), nối thêm domain server
    return `http://127.0.0.1:8000${url}`;
  };

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

          // --- THÊM DÒNG QUAN TRỌNG NÀY ---
          category_detail: feature.properties.category_detail,
          // -------------------------------

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
          note: feature.properties.note,
          phone: feature.properties.phone,
          email: feature.properties.email,
        }));
        setStores(formattedStores);
      })
      .catch(err => console.error("Lỗi tải data:", err));
  };

  // --- WebSocket connection for real-time store updates ---
  useEffect(() => {
    // Determine WS URL based on current protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use localhost or whatever the API domain is
    const wsUrl = `${wsProtocol}//127.0.0.1:8000/ws/stores/`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to Store WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const wsReceiveTime = Date.now();
        const data = JSON.parse(event.data);
        if (data.message && (data.message.action === 'STORE_ADDED' || data.message.action === 'STORE_UPDATED')) {
          console.log(`⚡ [MEASURE] Đo lường độ trễ cập nhật thời gian thực (WebSocket). Nhận dữ liệu lúc: ${wsReceiveTime} ms.`);
          console.log("Cập nhật dữ liệu cửa hàng từ server:", data.message);
          fetchStoreData(); // Tự động refetch danh sách cửa hàng
        }
      } catch (e) {
        console.error("Lỗi xử lý websocket message:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("Lỗi WebSocket:", error);
    };

    ws.onclose = () => {
      console.log('Disconnected from Store WebSocket');
    };

    return () => {
      if (ws.readyState === 1) { // OPEN
        ws.close();
      }
    };
  }, []); // Only run once on mount

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

  // 4. Xử lý Click trên bản đồ
  const handleMapClick = (coords) => {

    if (selectingMode === 'start') {
      setStartPoint(coords);
      setSelectingMode(null);
      return;
    }
    if (selectingMode === 'end') {
      setEndPoint(coords);
      setSelectingMode(null);
      return;
    }
    if (selectingMode === 'waypoint') {
      setWaypoints(prev => [...prev, coords]);
      setSelectingMode(null);
      return;
    }

    // Nếu đang có Panel chi tiết quán thì đóng lại
    if (selectedStore) { setSelectedStore(null); }
  };

  const handleSelectStoreFromSearch = (store) => {
    // A. Set điểm đến là tọa độ quán
    setEndPoint([store.lng, store.lat]);

    // B. Nếu chưa có điểm đi, tự động bật chế độ chọn điểm đi
    if (!startPoint) {
      setSelectingMode('start');
    }

    // C. Focus bản đồ vào quán đó (Tuỳ chọn, nếu MapComponent hỗ trợ)
    // flyTo(store.lng, store.lat); 
  };

  const handleClearRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setWaypoints([]);
    setSelectingMode(null);
    setRouteInstructions([]);
    setActiveRouteStep(null);
    setShowStandaloneRoute(true);
  };

  // Callback từ SearchBar tab "Từ ảnh" sau khi trích xuất GPS thành công
  const handleSetCoords = (type, lat, lng) => {
    if (type === 'start') setStartPoint([lng, lat]);
    else setEndPoint([lng, lat]);
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

  // 6. Logic lọc hiển thị (Cho phép lọc nhiều mục)
  const displayedStores = stores.filter(store => {
    if (activeFilters.length === 0) return true;

    const isFavSelected = activeFilters.includes('favorites');
    let isFavoriteStore = false;
    if (isFavSelected && currentUser) {
      const favStoreIds = favorites.map(f => f.store);
      isFavoriteStore = favStoreIds.includes(store.id);
    }

    // Lấy các category ID được chọn (loại bỏ 'favorites' ra khỏi list)
    const categoryFilters = activeFilters.filter(f => f !== 'favorites').map(f => parseInt(f));

    // Nếu chỉ lọc mỗi "Yêu thích"
    if (activeFilters.length === 1 && isFavSelected) {
      return isFavoriteStore;
    }

    // Hàm check category
    const matchCategory = categoryFilters.length > 0 ? categoryFilters.includes(store.category) : true;

    // Nếu lọc cả "yêu thích" VÀ "danh mục", ta kết hợp cả 2 điều kiện (yêu thích nằm trong danh mục đó)
    if (isFavSelected && categoryFilters.length > 0) {
      return isFavoriteStore && matchCategory;
    }

    return matchCategory;
  });

  return (
    <>
      {/* Loading Screen */}
      {appLoading && (
        <div className={`initial-loader ${isFadingOut ? 'fade-out' : ''}`}>
          <div className="loader-content">
            <img src="/icon_map.png" alt="Map Logo" className="loader-logo" />
            <h2 className="loader-title">Cần Thơ Map</h2>
          </div>
        </div>
      )}

      <div className="app-container">
        <MapComponent
          mapType={mapType}
          selectingMode={selectingMode}
          startPoint={startPoint}
          endPoint={endPoint}
          waypoints={waypoints}
          onMapClick={handleMapClick}
          onStoreClick={handleStoreClick}
          stores={displayedStores}
          selectedStore={selectedStore}
          currentLocation={currentLocation}
          triggerFlyTo={triggerFlyTo}
          activeFilters={activeFilters}
          onRouteCalculated={setRouteInstructions}
          activeRouteStep={activeRouteStep}
        />

        <div className="ui-overlay">
          {/* Góc Trái Trên: Tìm kiếm & Bộ lọc */}
          <div className="bottom-right-search">
            {/* Nút "Về vị trí của tôi" bám trên SearchBar */}
            {currentLocation && (
              <button
                className="fly-to-location-btn filter-fly-btn"
                title="Về vị trí hiện tại"
                onClick={() => setTriggerFlyTo(prev => prev + 1)}
              >
                📍 Về vị trí của tôi
              </button>
            )}

            <SearchBar
              stores={stores}
              onSelectStore={handleSelectStoreFromSearch}
              onSetMode={setSelectingMode}
              onSetCoords={handleSetCoords}
              onUseCurrentLocation={() => { if (currentLocation) setStartPoint(currentLocation); }}
              currentLocation={currentLocation}
              startPoint={startPoint}
              endPoint={endPoint}
              onClearRoute={handleClearRoute}
            />

          </div>

          <div className={`floating-controls-container ${selectedStore ? 'panel-open' : ''}`}>
            <FloatingControls
              categories={categories}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              currentUser={currentUser}
            />
          </div>

          {/* Góc Phải Trên: User & Nút Thêm */}
          <div className="top-right-user">
            {currentUser ? (
              <div className="user-badge">
                <span onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
                  {/* Nếu có avatar thì hiện avatar nhỏ, không thì icon */}
                  {currentUser.avatar ? (
                    <img
                      src={getAvatarUrl(currentUser.avatar)}  // <--- SỬA DÒNG NÀY
                      alt="avt"
                      style={{
                        width: 30, height: 30,
                        borderRadius: '50%', objectFit: 'cover', // Thêm objectFit để ảnh tròn không bị méo
                        verticalAlign: 'middle', marginRight: 5
                      }}
                    />
                  ) : (
                    <IoPersonCircle size={24} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                  )}
                  Xin chào! <strong>{currentUser.last_name} {currentUser.first_name}</strong>
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
          <div className={`bottom-left-area ${selectedStore ? 'panel-open' : ''}`}>
            <LayerSwitcher currentType={mapType} onSwitch={setMapType} />
          </div>

          {/* --- CÁC PANEL & MODAL --- */}

          {/* Panel Chi tiết Quán HOẶC Panel Chỉ đường (khi không chọn quán mà có lộ trình) */}
          {(selectedStore || (startPoint && endPoint && !routeHasStore)) && (
            <LocationPanel
              location={selectedStore} 
              isMinimized={!selectedStore && !showStandaloneRoute}
              onToggleMinimize={() => setShowStandaloneRoute(p => !p)}
              onClose={() => {
                  if (selectedStore) setSelectedStore(null);
              }}
              isFavorite={selectedStore ? favorites.some(f => f.store === selectedStore.id) : false}
              onToggleFavorite={() => selectedStore && handleToggleFavorite(selectedStore.id)}
              onDirections={() => selectedStore && handleDirections(selectedStore)}
              hasRoute={!!(startPoint && endPoint)}
              onAddWaypoint={() => {
                if (selectedStore) {
                  setWaypoints(prev => [...prev, [selectedStore.lng, selectedStore.lat]]);
                }
              }}
              onSetAsDestination={() => {
                if (selectedStore) {
                  if (endPoint) {
                    setWaypoints(prev => [...prev, endPoint]);
                  }
                  setEndPoint([selectedStore.lng, selectedStore.lat]);
                }
              }}
              onRemoveFromRoute={() => {
                if (selectedStore) {
                  const matchesStore = (pt) => pt && pt[0] === selectedStore.lng && pt[1] === selectedStore.lat;
                  if (matchesStore(startPoint)) setStartPoint(null);
                  else if (matchesStore(endPoint)) setEndPoint(null);
                  else setWaypoints(prev => prev.filter(wp => !matchesStore(wp)));
                }
              }}
              routeInstructions={routeInstructions}
              isStoreInRoute={
                  selectedStore ? (
                    (startPoint && startPoint[0] === selectedStore.lng && startPoint[1] === selectedStore.lat) ||
                    (endPoint && endPoint[0] === selectedStore.lng && endPoint[1] === selectedStore.lat) ||
                    (waypoints.some(wp => wp[0] === selectedStore.lng && wp[1] === selectedStore.lat))
                  ) : false
              }
              onRouteStepClick={setActiveRouteStep}
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
    </>

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