import React from 'react';
import { IoRestaurant, IoCafe, IoBed, IoCar, IoClose, IoGrid, IoHeart } from "react-icons/io5";

const FloatingControls = ({ categories, currentFilter, onFilterChange, currentUser}) => {
  
  // Hàm map Icon theo tên danh mục (Backend trả về tên gì thì map icon đó)
  const getIcon = (slug) => {
    if (slug.includes('cafe')) return <IoCafe />;
    if (slug.includes('nha-hang') || slug.includes('food')) return <IoRestaurant />;
    if (slug.includes('hotel') || slug.includes('khach-san')) return <IoBed />;
    if (slug.includes('gas') || slug.includes('xang') || slug.includes('car')) return <IoCar />;
    return <IoGrid />; // Icon mặc định
  };

  return (
    <div className="floating-controls">
      <div className="quick-filters">
        {/* Nút Xóa lọc */}
        {currentFilter !== 'all' && (
           <button className="pill-btn clear" onClick={() => onFilterChange('all')}>
             <IoClose /> Xóa lọc
           </button>
        )}

        {/* --- NÚT LỌC YÊU THÍCH (Chỉ hiện khi đã đăng nhập hoặc muốn cho khách thấy để kích thích login) --- */}
        <button 
            className={`pill-btn ${currentFilter === 'favorites' ? 'active-heart' : ''}`} 
            onClick={() => {
                if(!currentUser) {
                    alert("Bạn cần đăng nhập để xem danh sách yêu thích!");
                    return;
                }
                onFilterChange('favorites');
            }}
            style={{ borderColor: currentFilter === 'favorites' ? '#EA4335' : '#ddd' }}
        >
            Đã thích <IoHeart color={currentFilter === 'favorites' ? '#fff' : '#EA4335'} />
        </button>
        {/* ----------------------------------------------------------------------------------------- */}

        {/* Danh sách danh mục từ DB */}
        {categories.map(cat => (
          <button 
            key={cat.id}
            className={`pill-btn ${currentFilter === cat.id ? 'active' : ''}`} 
            onClick={() => onFilterChange(cat.id)}
          >
            {cat.name} {getIcon(cat.slug || '')}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FloatingControls;