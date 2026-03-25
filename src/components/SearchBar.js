import React, { useState, useEffect, useRef } from 'react';
import {
  IoSearch, IoLocationSharp, IoNavigate, IoClose,
  IoMap, IoEllipse, IoCheckmarkCircle, IoChevronDown,
  IoImage, IoWarning, IoCheckmark
} from "react-icons/io5";

const SearchBar = ({
  stores,
  onSelectStore,
  onSetMode,
  onSetCoords,
  onUseCurrentLocation,
  currentLocation,
  startPoint,
  endPoint,
  onClearRoute
}) => {
  // State quản lý việc mở rộng/thu gọn
  const [isExpanded, setIsExpanded] = useState(false);

  const [activeTab, setActiveTab] = useState('search');
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // --- State cho tab "Chọn ảnh" ---
  const [startPhoto, setStartPhoto] = useState(null);   // { file, previewUrl, lat, lng, error, loading }
  const [endPhoto, setEndPhoto] = useState(null);

  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  // Tự động mở rộng nếu đã chọn điểm đi hoặc đến để người dùng thấy lộ trình
  useEffect(() => {
    if (startPoint || endPoint) {
      setIsExpanded(true);
    }
  }, [startPoint, endPoint]);

  // Logic tìm kiếm
  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      return;
    }
    const lowerKey = keyword.toLowerCase();
    const results = stores.filter(store =>
      store.name.toLowerCase().includes(lowerKey) ||
      store.address.toLowerCase().includes(lowerKey)
    );
    setSuggestions(results.slice(0, 5));
  }, [keyword, stores]);

  const handleSelectResult = (store) => {
    setKeyword(store.name);
    setSuggestions([]);
    onSelectStore(store);
  };

  const handleClear = () => {
    onClearRoute();
    setKeyword('');
    setStartPhoto(null);
    setEndPhoto(null);
  };

  // --- Hàm xử lý upload ảnh GPS ---
  const handlePhotoUpload = async (file, type) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const setter = type === 'start' ? setStartPhoto : setEndPhoto;

    // Hiện preview + loading spinner
    setter({ file, previewUrl, lat: null, lng: null, error: null, loading: true });

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('http://127.0.0.1:8000/api/extract-gps/', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.lat !== undefined && data.lng !== undefined) {
        setter({ file, previewUrl, lat: data.lat, lng: data.lng, error: null, loading: false });
        // Đẩy tọa độ lên App.js và tự động set điểm
        if (onSetCoords) onSetCoords(type, data.lat, data.lng);
      } else {
        setter({ file, previewUrl, lat: null, lng: null, error: data.error || 'Lỗi không xác định.', loading: false });
      }
    } catch (err) {
      setter({ file, previewUrl, lat: null, lng: null, error: 'Không kết nối được server.', loading: false });
    }
  };

  // --- TRẠNG THÁI THU GỌN ---
  if (!isExpanded) {
    return (
      <button
        className="search-trigger-btn"
        onClick={() => setIsExpanded(true)}
        title="Mở tìm kiếm & Chỉ đường"
      >
        <IoSearch size={28} />
      </button>
    );
  }

  // --- TRẠNG THÁI MỞ RỘNG ---
  return (
    <div className="search-bar-container">

      {/* Danh sách gợi ý */}
      {suggestions.length > 0 && (
        <ul className="suggestion-list">
          {suggestions.map(store => (
            <li key={store.id} onClick={() => handleSelectResult(store)}>
              <div className="sugg-icon">
                <IoLocationSharp size={18} />
              </div>
              <div className="sugg-info">
                <strong>{store.name}</strong>
                <p>{store.address}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Header Tabs & Nút Đóng */}
      <div className="search-tabs">
        <button
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          <IoSearch size={18} /> Tìm kiếm
        </button>
        <button
          className={activeTab === 'manual' ? 'active' : ''}
          onClick={() => setActiveTab('manual')}
        >
          <IoMap size={18} /> Bản đồ
        </button>
        <button
          className={activeTab === 'picture' ? 'active' : ''}
          onClick={() => setActiveTab('picture')}
        >
          <IoImage size={18} /> Từ ảnh
        </button>

        {/* Nút thu gọn */}
        <button className="btn-collapse-search" onClick={() => setIsExpanded(false)} title="Thu gọn">
          <IoChevronDown size={20} />
        </button>
      </div>

      <div className="tab-content">

        {/* --- TAB 1: SEARCH --- */}
        {activeTab === 'search' && (
          <div className="search-mode">
            <div className="input-wrapper">
              <IoSearch color="#999" size={20} style={{ marginRight: 10 }} />
              <input
                type="text"
                placeholder="Tìm địa điểm, quán ăn..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                autoFocus
              />
              {keyword && (
                <button className="clear-text" onClick={() => setKeyword('')}>
                  <IoClose size={14} />
                </button>
              )}
            </div>

            {/* Nút vị trí hiện tại */}
            {currentLocation && (
              <button className="use-location-btn" onClick={onUseCurrentLocation}>
                <span className="pulse-dot" />
                Vị trí hiện tại của tôi
              </button>
            )}

            {/* Timeline Lộ trình */}
            <div className="route-status">
              <div className="route-line"></div>

              <div className={`status-item ${startPoint ? 'active' : ''}`}>
                <div className="status-icon start">
                  {startPoint ? <IoNavigate size={16} /> : <IoEllipse size={10} />}
                </div>
                <span className="status-text">
                  {startPoint ? "Vị trí của bạn" : "Chưa chọn điểm đi"}
                </span>
              </div>

              <div className={`status-item ${endPoint ? 'active' : ''}`}>
                <div className="status-icon end">
                  <IoLocationSharp size={18} />
                </div>
                <span className="status-text">
                  {endPoint ? (keyword || "Điểm đến đã chọn") : "Chưa chọn điểm đến"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: MANUAL --- */}
        {activeTab === 'manual' && (
          <div className="manual-mode">
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center' }}>
              Click nút dưới rồi chạm vào bản đồ
            </p>

            {/* Nút vị trí hiện tại cho điểm đi */}
            {currentLocation && (
              <button className="use-location-btn" style={{ marginBottom: 8 }} onClick={onUseCurrentLocation}>
                <span className="pulse-dot" />
                Dùng vị trí hiện tại làm điểm đi
              </button>
            )}

            <div className="manual-actions">
              <button
                className={`btn-action ${startPoint ? 'active-step' : ''}`}
                onClick={() => onSetMode('start')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoNavigate color={startPoint ? "#1A73E8" : "#999"} />
                  <span>1. Chọn điểm đi</span>
                </div>
                {startPoint && <IoCheckmarkCircle color="#1e8e3e" size={20} />}
              </button>
            </div>

            <div className="manual-actions">
              <button
                className={`btn-action ${endPoint ? 'active-step' : ''}`}
                onClick={() => onSetMode('end')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoLocationSharp color={endPoint ? "#EA4335" : "#999"} />
                  <span>2. Chọn điểm đến</span>
                </div>
                {endPoint && <IoCheckmarkCircle color="#1e8e3e" size={20} />}
              </button>
            </div>

            {/* --- MỚI: THÊM TRẠM DỪNG (WAYPOINT) TỪ TÌM KIẾM --- */}
            {(startPoint || endPoint) && (
            <div className="manual-actions" style={{ marginTop: '10px' }}>
              <button
                className="btn-action"
                onClick={() => onSetMode('waypoint')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoEllipse color="#F4B400" />
                  <span>3. Thêm trạm dừng trên map</span>
                </div>
              </button>
            </div>
            )}
          </div>
        )}

        {/* --- TAB 3: PICTURE GPS --- */}
        {activeTab === 'picture' && (
          <div className="picture-gps-mode">
            <p className="picture-gps-hint">
              Tải ảnh chụp từ điện thoại (có GPS) để lấy tọa độ tự động
            </p>

            {/* === Điểm ĐI === */}
            <div className="photo-upload-box">
              <div className="photo-upload-header">
                <IoNavigate size={15} color="#1A73E8" />
                <span>Điểm đi</span>
                {startPoint && !startPhoto?.error && (
                  <span className="gps-ok-badge"><IoCheckmark size={12} /> Đã có</span>
                )}
              </div>

              {startPhoto ? (
                <div className="photo-preview-row">
                  <img src={startPhoto.previewUrl} className="photo-thumb" alt="start" />
                  <div className="photo-info">
                    {startPhoto.loading && <p className="gps-loading">Đang đọc GPS...</p>}
                    {!startPhoto.loading && startPhoto.error && (
                      <>
                        <p className="gps-error"><IoWarning size={13} /> {startPhoto.error}</p>
                        <button className="map-pick-btn" onClick={() => { onSetMode('start'); }}>
                          <IoMap size={13} /> Chọn trên bản đồ
                        </button>
                      </>
                    )}
                    {!startPhoto.loading && !startPhoto.error && (
                      <p className="gps-coords">
                        📍 {startPhoto.lat?.toFixed(5)}, {startPhoto.lng?.toFixed(5)}
                      </p>
                    )}
                    <button className="change-photo-btn" onClick={() => { setStartPhoto(null); startInputRef.current?.click(); }}>
                      Đổi ảnh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="photo-drop-area" onClick={() => startInputRef.current?.click()}>
                  <IoImage size={28} color="#ccc" />
                  <span>Chọn ảnh</span>
                  {!startPoint && (
                    <button className="map-pick-btn-inline" onClick={(e) => { e.stopPropagation(); onSetMode('start'); }}>
                      hoặc chọn trên bản đồ
                    </button>
                  )}
                  {startPoint && <p className="gps-ok-small">✓ Đã chọn trên bản đồ</p>}
                </div>
              )}

              <input
                ref={startInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoUpload(e.target.files[0], 'start')}
              />
            </div>

            {/* === Điểm ĐẾN === */}
            <div className="photo-upload-box">
              <div className="photo-upload-header">
                <IoLocationSharp size={15} color="#EA4335" />
                <span>Điểm đến</span>
                {endPoint && !endPhoto?.error && (
                  <span className="gps-ok-badge"><IoCheckmark size={12} /> Đã có</span>
                )}
              </div>

              {endPhoto ? (
                <div className="photo-preview-row">
                  <img src={endPhoto.previewUrl} className="photo-thumb" alt="end" />
                  <div className="photo-info">
                    {endPhoto.loading && <p className="gps-loading">Đang đọc GPS...</p>}
                    {!endPhoto.loading && endPhoto.error && (
                      <>
                        <p className="gps-error"><IoWarning size={13} /> {endPhoto.error}</p>
                        <button className="map-pick-btn" onClick={() => { onSetMode('end'); }}>
                          <IoMap size={13} /> Chọn trên bản đồ
                        </button>
                      </>
                    )}
                    {!endPhoto.loading && !endPhoto.error && (
                      <p className="gps-coords">
                        📍 {endPhoto.lat?.toFixed(5)}, {endPhoto.lng?.toFixed(5)}
                      </p>
                    )}
                    <button className="change-photo-btn" onClick={() => { setEndPhoto(null); endInputRef.current?.click(); }}>
                      Đổi ảnh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="photo-drop-area" onClick={() => endInputRef.current?.click()}>
                  <IoImage size={28} color="#ccc" />
                  <span>Chọn ảnh</span>
                  {!endPoint && (
                    <button className="map-pick-btn-inline" onClick={(e) => { e.stopPropagation(); onSetMode('end'); }}>
                      hoặc chọn trên bản đồ
                    </button>
                  )}
                  {endPoint && <p className="gps-ok-small">✓ Đã chọn trên bản đồ</p>}
                </div>
              )}

              <input
                ref={endInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoUpload(e.target.files[0], 'end')}
              />
            </div>

            {/* Hướng dẫn */}
            <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 8, lineHeight: 1.4 }}>
              💡 Ảnh phải được chụp bằng điện thoại với GPS bật.
              Nếu ảnh không có GPS, chọn điểm trên bản đồ.
            </p>
          </div>
        )}

        {/* Nút Xóa lộ trình */}
        {(startPoint || endPoint) && (
          <button className="btn-clear-route" onClick={handleClear}>
            <IoClose size={16} /> Xóa lộ trình
          </button>
        )}

      </div>
    </div>
  );
};

export default SearchBar;