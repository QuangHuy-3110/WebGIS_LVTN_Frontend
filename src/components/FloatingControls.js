import React, { useState } from 'react';
import { IoRestaurant, IoCafe, IoBed, IoCar, IoClose, IoGrid, IoHeart, IoEllipsisHorizontal } from "react-icons/io5";

const FloatingControls = ({ categories, activeFilters = [], onFilterChange, currentUser }) => {
  const [showMore, setShowMore] = useState(false);

  // Hàm map Icon theo tên danh mục (Backend trả về tên gì thì map icon đó)
  const getIcon = (slug) => {
    if (!slug) return <IoGrid />;
    if (slug.includes('cafe')) return <IoCafe />;
    if (slug.includes('nha-hang') || slug.includes('food')) return <IoRestaurant />;
    if (slug.includes('hotel') || slug.includes('khach-san')) return <IoBed />;
    if (slug.includes('gas') || slug.includes('xang') || slug.includes('car')) return <IoCar />;
    return <IoGrid />; // Icon mặc định
  };

  const toggleFilter = (id) => {
    if (activeFilters.includes(id)) {
      onFilterChange(activeFilters.filter(f => f !== id));
    } else {
      onFilterChange([...activeFilters, id]);
    }
  };

  const clearFilters = () => {
    onFilterChange([]);
  };

  // 1. Phân loại danh mục
  const baseCategories = categories.slice(0, 4);
  const dropdownCategories = categories.slice(4);

  // Tính số lượng mục đang được chọn bên trong dropdown
  const selectedDropdownCount = dropdownCategories.filter(cat => activeFilters.includes(cat.id)).length;

  return (
    <div className="floating-controls">
      <div className="quick-filters">
        {/* Nút Xóa lọc */}
        {activeFilters.length > 0 && (
          <button className="pill-btn clear" onClick={clearFilters}>
            <IoClose /> Xóa lọc
          </button>
        )}

        {/* --- NÚT LỌC YÊU THÍCH --- */}
        <button
          className={`pill-btn ${activeFilters.includes('favorites') ? 'active-heart' : ''}`}
          onClick={() => {
            if (!currentUser) {
              alert("Bạn cần đăng nhập để xem danh sách yêu thích!");
              return;
            }
            toggleFilter('favorites');
          }}
          style={{ borderColor: activeFilters.includes('favorites') ? '#EA4335' : '#ddd' }}
        >
          Đã thích <IoHeart color={activeFilters.includes('favorites') ? '#fff' : '#EA4335'} />
        </button>

        {/* Danh sách danh mục từ DB */}
        {baseCategories.map(cat => (
          <button
            key={cat.id}
            className={`pill-btn ${activeFilters.includes(cat.id) ? 'active' : ''}`}
            onClick={() => toggleFilter(cat.id)}
          >
            {cat.name} {getIcon(cat.slug || '')}
          </button>
        ))}

        {/* Nút ba chấm nếu còn mục ẩn */}
        {dropdownCategories.length > 0 && (
          <div style={{ position: 'static' }}>
            <button
              className={`pill-btn ${showMore || selectedDropdownCount > 0 ? 'active' : ''}`}
              onClick={() => setShowMore(!showMore)}
            >
              <IoEllipsisHorizontal /> Thêm {selectedDropdownCount > 0 && `(${selectedDropdownCount})`}
            </button>

            {showMore && (
              <div className="more-categories-dropdown">
                {dropdownCategories.map(cat => (
                  <button
                    key={cat.id}
                    className={`dropdown-item-btn ${activeFilters.includes(cat.id) ? 'active-dropdown-item' : ''}`}
                    onClick={() => {
                      toggleFilter(cat.id);
                    }}
                  >
                    {cat.name} {getIcon(cat.slug || '')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingControls;