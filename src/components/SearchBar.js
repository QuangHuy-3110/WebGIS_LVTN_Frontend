import React, { useState, useEffect } from 'react';
import { 
  IoSearch, IoLocationSharp, IoNavigate, IoClose, 
  IoMap, IoEllipse, IoCheckmarkCircle, IoChevronDown 
} from "react-icons/io5";

const SearchBar = ({ 
  stores,             
  onSelectStore,      
  onSetMode,          
  startPoint,         
  endPoint,           
  onClearRoute        
}) => {
  // State quản lý việc mở rộng/thu gọn
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [activeTab, setActiveTab] = useState('search'); 
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState([]);

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
    // Không đóng lại sau khi chọn để người dùng thấy kết quả/lộ trình
  };

  const handleClear = () => {
      onClearRoute();
      setKeyword('');
      // Có thể đóng lại sau khi xóa nếu muốn: setIsExpanded(false);
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
          <IoSearch size={18}/> Tìm kiếm
        </button>
        <button 
          className={activeTab === 'manual' ? 'active' : ''} 
          onClick={() => setActiveTab('manual')}
        >
          <IoMap size={18}/> Chọn bản đồ
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
              <IoSearch color="#999" size={20} style={{marginRight: 10}} />
              <input 
                type="text" 
                placeholder="Tìm địa điểm, quán ăn..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                autoFocus // Tự động focus khi mở
              />
              {keyword && (
                <button className="clear-text" onClick={() => setKeyword('')}>
                    <IoClose size={14} />
                </button>
              )}
            </div>
            
            {/* Timeline Lộ trình */}
            <div className="route-status">
               <div className="route-line"></div>

               <div className={`status-item ${startPoint ? 'active' : ''}`}>
                  <div className="status-icon start">
                      {startPoint ? <IoNavigate size={16}/> : <IoEllipse size={10}/>}
                  </div>
                  <span className="status-text">
                      {startPoint ? "Vị trí của bạn" : "Chưa chọn điểm đi"}
                  </span>
               </div>

               <div className={`status-item ${endPoint ? 'active' : ''}`}>
                  <div className="status-icon end">
                      <IoLocationSharp size={18}/>
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
            <p style={{fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center'}}>
                Click nút dưới rồi chạm vào bản đồ
            </p>
            
            <div className="manual-actions">
              <button 
                className={`btn-action ${startPoint ? 'active-step' : ''}`} 
                onClick={() => onSetMode('start')}
              >
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <IoNavigate color={startPoint ? "#1A73E8" : "#999"} /> 
                    <span>1. Chọn điểm đi</span>
                </div>
                {startPoint && <IoCheckmarkCircle color="#1e8e3e" size={20}/>}
              </button>
            </div>

            <div className="manual-actions">
              <button 
                className={`btn-action ${endPoint ? 'active-step' : ''}`} 
                onClick={() => onSetMode('end')}
              >
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <IoLocationSharp color={endPoint ? "#EA4335" : "#999"} /> 
                    <span>2. Chọn điểm đến</span>
                </div>
                {endPoint && <IoCheckmarkCircle color="#1e8e3e" size={20}/>}
              </button>
            </div>
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