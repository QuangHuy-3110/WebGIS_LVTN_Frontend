import React, { useState, useEffect, useRef } from 'react';
import {
  IoSearch, IoLocationSharp, IoNavigate, IoClose,
  IoMap, IoEllipse, IoCheckmarkCircle, IoChevronDown,
  IoImage, IoWarning, IoCheckmark
} from "react-icons/io5";
import { useAuth } from '../context/AuthContext';

const SearchBar = ({
  stores,
  onSelectStore,
  onSetMode,
  onSetCoords,
  onUseCurrentLocation,
  startPoint,
  endPoint,
  onClearRoute,
  onHoverStore, // New Prop
  currentLocation
}) => {
  // State quản lý việc mở rộng/thu gọn
  const [isExpanded, setIsExpanded] = useState(false);

  const [activeTab, setActiveTab] = useState('search');
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // --- Lịch sử tìm kiếm ---
  const { currentUser, authFetch } = useAuth();
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  useEffect(() => {
    if (currentUser && authFetch) {
      authFetch('http://127.0.0.1:8000/api/search-history/')
        .then(res => res.json())
        .then(data => {
            let results = data.results || data;
            if (Array.isArray(results)) {
              setRecentSearches(results); // Bỏ giới hạn, hiện tất cả có thanh cuộn
            }
        })
        .catch(err => console.error("Lỗi tải lịch sử:", err));
    } else {
        setRecentSearches([]);
    }
  }, [currentUser, authFetch]);

  const saveSearchHistory = (kw) => {
    if (!currentUser || !authFetch || !kw.trim()) return;
    authFetch('http://127.0.0.1:8000/api/search-history/', {
      method: 'POST',
      body: JSON.stringify({ keyword: kw.trim() })
    })
    .then(res => {
        if(res.ok) {
            res.json().then(newHistory => {
                setRecentSearches(prev => {
                    const filtered = prev.filter(item => item.keyword.toLowerCase() !== newHistory.keyword.toLowerCase());
                    return [newHistory, ...filtered];
                });
            });
        }
    })
    .catch(err => console.error(err));
  };

  const deleteSearchHistory = (id, e) => {
    e.preventDefault();
    e.stopPropagation(); // Không trigger làm đóng lịch sử
    if (!currentUser || !authFetch) return;
    authFetch(`http://127.0.0.1:8000/api/search-history/${id}/`, {
      method: 'DELETE'
    })
    .then(res => {
        if(res.ok || res.status === 204) {
             setRecentSearches(prev => prev.filter(item => item.id !== id));
        }
    })
    .catch(err => console.error(err));
  };

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

  // Hàm tính khoảng cách (Haversine formula in km)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Từ điển đồng nghĩa ngữ nghĩa (Semantic Dictionary)
  const categorySynonyms = {
    'Ẩm thực': ['quán ăn', 'tiệm ăn', 'nhà hàng', 'cơm', 'phở', 'bún', 'hủ tiếu', 'đồ ăn', 'ẩm thực', 'ăn uống', 'lẩu', 'nướng', 'quán nhậu'],
    'Đồ uống': ['cafe', 'cà phê', 'quán nước', 'trà sữa', 'đồ uống', 'giải khát', 'sinh tố', 'tiệm nước', 'bar', 'pub'],
    'Xe Cộ & Phương Tiện': ['xăng', 'đổ xăng', 'cây xăng', 'trạm xăng', 'sửa xe', 'rửa xe', 'xe máy', 'ô tô', 'phụ tùng', 'gara'],
    'Lưu Trú': ['khách sạn', 'nhà nghỉ', 'hotel', 'motel', 'homestay', 'resort', 'nghỉ ngơi', 'chú trọ', 'chỗ ngủ'],
    'Y Tế & Sức Khỏe': ['bệnh viện', 'nha khoa', 'phòng khám', 'nhà thuốc', 'tiệm thuốc', 'y tế', 'trạm y tế', 'cấp cứu'],
    'Siêu Thị & Tạp Hóa': ['siêu thị', 'tạp hóa', 'tiện lợi', 'minimart', 'cửa hàng', 'bách hóa', 'vinmart', 'coop'],
    'Làm Đẹp & Spa': ['spa', 'thẩm mỹ', 'hớt tóc', 'cắt tóc', 'nail', 'salon', 'massage', 'gội đầu'],
    'Giáo Dục': ['trường', 'đại học', 'cao đẳng', 'trung học', 'tiểu học', 'mầm non', 'trung tâm', 'ngoại ngữ', 'giáo dục'],
    'Tôn Giáo': ['chùa', 'nhà thờ', 'đền', 'miếu', 'thánh thất', 'tôn giáo'],
    'Công Nghệ & Điện Máy': ['điện máy', 'điện thoại', 'máy tính', 'laptop', 'phụ kiện', 'công nghệ', 'sửa điện thoại'],
    'Hành Chính & Công Cộng': ['ủy ban', 'công an', 'trụ sở', 'bưu điện', 'nhà nước', 'phường', 'quận'],
    'Tài Chính & Doanh Nghiệp': ['ngân hàng', 'atm', 'tín dụng', 'cầm đồ', 'tài chính', 'bank']
  };

  const getImpliedCategories = (word) => {
    const implied = [];
    for (const [catName, synonyms] of Object.entries(categorySynonyms)) {
      if (synonyms.some(syn => word.includes(syn))) {
        implied.push(catName.toLowerCase());
      }
    }
    return implied;
  };

  // Logic tìm kiếm thông minh khi gõ kiểu Google Maps
  const handleKeywordChange = (text) => {
    setKeyword(text);
    if (!text.trim()) {
      setSuggestions([]);
      setShowRecent(true);
      return;
    }
    setShowRecent(false);
    const lowerKey = text.toLowerCase();
    
    // Tự động bỏ qua các từ khóa dư thừa
    let searchWord = lowerKey.replace('gần đây', '').replace('gan day', '').replace('ở đâu', '').trim();
    const impliedCategories = getImpliedCategories(searchWord); 

    let results = stores.filter(store => {
      // Nếu người dùng chỉ gõ "gần đây", ta hiển thị tất cả
      if (!searchWord) return true;

      const matchName = store.name.toLowerCase().includes(searchWord);
      const matchAddress = store.address.toLowerCase().includes(searchWord);
      const matchCatDirect = store.category_name ? store.category_name.toLowerCase().includes(searchWord) : false;
      const matchSemanticCat = store.category_name && impliedCategories.includes(store.category_name.toLowerCase());
      
      return matchName || matchAddress || matchCatDirect || matchSemanticCat;
    });

    // BAO GIỜ CŨNG SẮP XẾP ƯU TIÊN VỊ TRÍ GẦN NHẤT NẾU ĐÃ CẤP QUYỀN GPS
    if (currentLocation) {
      const [uLng, uLat] = currentLocation;
      results.forEach(store => {
        store.tempDistance = getDistance(uLat, uLng, store.lat, store.lng);
      });
      // Sort khoảng cách tăng dần (gần nhất lên đầu)
      results.sort((a, b) => a.tempDistance - b.tempDistance);
    }

    setSuggestions(results.slice(0, 10)); // Trả về tối đa 10 gợi ý cho Semantic Search
  };

  const handleSelectResult = (store) => {
    const savedKw = keyword.trim() ? keyword.trim() : store.name;
    saveSearchHistory(savedKw);
    
    setKeyword(store.name);
    setSuggestions([]);
    setShowRecent(false);
    onSelectStore(store);
  };

  const handleClear = () => {
    onClearRoute();
    handleKeywordChange('');
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
            <li 
              key={store.id} 
              onClick={() => handleSelectResult(store)}
              onMouseEnter={() => onHoverStore && onHoverStore(store.id)}
              onMouseLeave={() => onHoverStore && onHoverStore(null)}
            >
              <div className="sugg-icon">
                <IoLocationSharp size={18} />
              </div>
              <div className="sugg-info">
                <strong>{store.name}</strong>
                <p>
                   {store.tempDistance !== undefined && (
                     <span style={{ color: '#1A73E8', fontWeight: 'bold' }}>
                       (Cách {store.tempDistance < 1 ? Math.round(store.tempDistance * 1000) + 'm' : store.tempDistance.toFixed(1) + 'km'}) 
                     </span>
                   )}
                   {' '}{store.address}
                </p>
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
                onChange={(e) => handleKeywordChange(e.target.value)}
                onFocus={() => { if (!keyword.trim()) setShowRecent(true); }}
                onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && keyword.trim()) {
                        saveSearchHistory(keyword.trim());
                        setShowRecent(false);
                    }
                }}
                autoFocus
              />
              {keyword && (
                <button className="clear-text" onClick={() => handleKeywordChange('')}>
                  <IoClose size={14} />
                </button>
              )}
            </div>

            {/* Vùng Lịch Sử Tìm Kiếm */}
            {showRecent && recentSearches.length > 0 && (
              <div className="recent-searches-box" style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8, padding: '0 15px', fontWeight: 'bold' }}>Lịch sử tìm kiếm</div>
                <ul className="suggestion-list" style={{ 
                    position: 'relative', 
                    top: 0, left: 0, right: 'auto', bottom: 'auto', 
                    width: '100%', 
                    boxShadow: 'none', 
                    margin: 0, 
                    maxHeight: '200px', // Giới hạn chiều cao để sinh thanh cuộn
                    padding: 0 
                }}>
                  {recentSearches.map(item => (
                    <li 
                      key={item.id} 
                      onMouseDown={(e) => {
                        e.preventDefault(); // Tránh bị Blur input
                        handleKeywordChange(item.keyword);
                        saveSearchHistory(item.keyword);
                        setShowRecent(false);
                      }}
                      style={{ paddingRight: '15px' }} // Đề chừa chỗ cho nút xóa
                    >
                      <div className="sugg-icon" style={{ backgroundColor: 'transparent' }}>
                        <IoSearch size={18} color="#aaa" />
                      </div>
                      <div className="sugg-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <strong style={{ fontWeight: 'normal' }}>{item.keyword}</strong>
                        <button
                          title="Xóa khỏi lịch sử"
                          onMouseDown={(e) => deleteSearchHistory(item.id, e)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                            borderRadius: '50%'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f4'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <IoClose size={16} color="#999" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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