import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // <--- 1. Import AuthContext
import { 
  IoStar, IoStarHalf, IoNavigate, IoCallOutline, 
  IoHeart, IoHeartOutline, IoShareSocialOutline, 
  IoTimeOutline, IoLocationOutline, IoClose,
  IoChevronBack, IoChevronForward, IoPersonCircle, IoSend,
  IoInformationCircleOutline // <--- THÊM ICON NÀY
} from "react-icons/io5";
import EditRequestModal from './EditRequestModal'; // Import modal mới
import { IoCreateOutline } from "react-icons/io5"; // Icon bút chì

const LocationPanel = ({ location, onClose, isFavorite, onToggleFavorite }) => {
  const { currentUser, authFetch } = useAuth(); // <--- 2. Lấy currentUser và authFetch

  // State hiển thị
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // State cho Form bình luận
  const [newRating, setNewRating] = useState(5); // Mặc định 5 sao
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    setCurrentImageIndex(0);
    setReviews([]); 
    setNewRating(5); // Reset form
    setNewComment("");
    
    if (location?.id) {
      fetchReviews(location.id);
    }
  }, [location]);

  const handleModalNext = (e) => {
    e.stopPropagation(); // Ngăn việc click vào nút mà lại đóng modal
    if (!selectedImage || images.length <= 1) return;

    // Tìm vị trí ảnh hiện tại trong danh sách
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    // Tính vị trí ảnh tiếp theo (nếu là ảnh cuối thì quay về đầu)
    const nextIndex = (currentIndex + 1) % images.length;
    
    setSelectedImage(images[nextIndex]);
  };

  const handleModalPrev = (e) => {
    e.stopPropagation();
    if (!selectedImage || images.length <= 1) return;

    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    // Tính vị trí ảnh trước đó (nếu là ảnh đầu thì quay về cuối)
    const prevIndex = (currentIndex - 1 + images.length) % images.length;

    setSelectedImage(images[prevIndex]);
  };

  const fetchReviews = async (storeId) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reviews/?store=${storeId}`);
      const data = await res.json();
      const results = Array.isArray(data) ? data : (data.results || []);
      setReviews(results);
    } catch (err) {
      console.error("Lỗi tải bình luận:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // --- 3. HÀM GỬI BÌNH LUẬN ---
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      alert("Vui lòng nhập nội dung đánh giá!");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        store: location.id,
        rating: newRating,
        content: newComment,
        describe: location.describe
      };

      const res = await authFetch('http://127.0.0.1:8000/api/reviews/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newReviewData = await res.json();
        
        // Thêm review mới vào đầu danh sách ngay lập tức
        setReviews([newReviewData, ...reviews]);
        
        // Reset form
        setNewComment("");
        setNewRating(5);
        alert("Cảm ơn bạn đã đánh giá!");
      } else {
        alert("Lỗi khi gửi đánh giá. Có thể bạn đã đánh giá quán này rồi?");
      }
    } catch (error) {
      console.error("Lỗi gửi review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!location) return null;

  // Logic Slider ảnh & Render sao (Giữ nguyên như cũ)
  const images = (location.images && location.images.length > 0) ? location.images : [{ id: 'def', image: "https://via.placeholder.com/400x200" }];
  const currentImageSrc = images[currentImageIndex].image;
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) stars.push(<IoStar key={i} color="#F4B400" size={14} />);
      else if (rating >= i - 0.5) stars.push(<IoStarHalf key={i} color="#F4B400" size={14} />);
      else stars.push(<IoStar key={i} color="#E0E0E0" size={14} />);
    }
    return stars;
  };

  // Hàm render sao tương tác (cho form nhập liệu)
  const renderInputStars = () => {
    return [1, 2, 3, 4, 5].map(star => (
      <IoStar 
        key={star} 
        size={24} 
        color={star <= newRating ? "#F4B400" : "#E0E0E0"} 
        style={{ cursor: 'pointer', marginRight: 5 }}
        onClick={() => setNewRating(star)}
      />
    ));
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('vi-VN');

  return (
    <div className="location-panel">
      <button className="close-btn" onClick={onClose}><IoClose size={24}/></button>
      
      {/* Slider Ảnh */}
      <div className="location-image-container">
        <img 
            src={currentImageSrc} 
            alt={location.name} 
            className="main-img" 
            
            // --- THÊM SỰ KIỆN CLICK ---
            style={{ cursor: 'pointer' }} // Biến con trỏ thành hình bàn tay
            onClick={() => {
                // Lấy thông tin ảnh hiện tại trong mảng images
                const imgData = images[currentImageIndex];
                setSelectedImage(imgData);
            }}
            // --------------------------
        />
        {images.length > 1 && (
          <>
            <button className="img-nav-btn prev" onClick={prevImage}><IoChevronBack size={20}/></button>
            <button className="img-nav-btn next" onClick={nextImage}><IoChevronForward size={20}/></button>
            <div className="img-counter">{currentImageIndex + 1} / {images.length}</div>
          </>
        )}
      </div>

      {/* --- MODAL CHI TIẾT ẢNH --- */}
      {selectedImage && (
        <div className="image-detail-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedImage(null)}>
                <IoClose size={30} />
            </button>
            
            <div className="modal-body">
                {/* Cột Trái: Ảnh Lớn */}
                <div className="modal-image-col">

                    {images.length > 1 && (
                        <button className="modal-nav-btn prev" onClick={handleModalPrev}>
                            <IoChevronBack size={30} />
                        </button>
                    )}
                    
                    <img src={selectedImage.image} alt="Chi tiết" />

                    {/* --- NÚT NEXT --- */}
                    {images.length > 1 && (
                        <button className="modal-nav-btn next" onClick={handleModalNext}>
                            <IoChevronForward size={30} />
                        </button>
                    )}

                    {/* <img src={selectedImage.image} alt="Chi tiết" /> */}
                </div>

                {/* Cột Phải: Thông tin */}
                <div className="modal-info-col">
                    <h3>Thông tin hình ảnh</h3>
                    
                    <div className="info-item">
                        <strong>Mô tả:</strong>
                        <p>{selectedImage.describe || "Chưa có mô tả"}</p>
                    </div>

                    <div className="info-item">
                        <strong>Người đăng:</strong>
                        <div className="uploader-badge">
                            <IoPersonCircle size={20}/> 
                            {/* Ưu tiên hiển thị tên, nếu không có thì hiện ID hoặc "Ẩn danh" */}
                            <span>{selectedImage.uploaded_by_name || selectedImage.uploaded_by || "Ẩn danh"}</span>
                        </div>
                    </div>

                    <div className="info-item">
                        <strong>Trạng thái:</strong>
                        <span className={`status-tag ${selectedImage.state}`}>
                            {selectedImage.state === 'public' ? 'Công khai' : 'Riêng tư'}
                        </span>
                    </div>

                    <div className="info-item">
                        <strong>Thời gian đăng:</strong>
                        <div className="time-badge">
                           <IoTimeOutline /> 
                           <span>{selectedImage.time_up}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
      {/* --------------------------- */}

      <div className="panel-content">
        <h1 className="location-title">{location.name}</h1>
        {/* Rating & Info... (Giữ nguyên) */}
        <div className="rating-row">
          <span className="rating-num">{location.rating_avg || 0}</span>
          <div className="stars">{renderStars(location.rating_avg || 0)}</div>
          <span className="reviews">({location.rating_count || 0} đánh giá)</span>
        </div>
        <p className="category">{location.category_name} • {location.state || "Đang hoạt động"}</p>

        {/* Actions Row (Giữ nguyên) */}
        <div className="actions-row">
          <div className="action-item primary">
            <button className="circle-btn blue"><IoNavigate color="#fff" /></button>
            <span>Đường đi</span>
          </div>
          <div className="action-item">
             <button className="circle-btn"><IoCallOutline color="#1A73E8" /></button>
             <span>Gọi điện</span>
          </div>
          <div className="action-item" onClick={onToggleFavorite} style={{cursor: 'pointer'}}>
             <button className="circle-btn">
                {isFavorite ? <IoHeart color="#EA4335" size={24} /> : <IoHeartOutline color="#1A73E8" size={24} />}
             </button>
             <span style={{ color: isFavorite ? '#EA4335' : '#333' }}>{isFavorite ? 'Đã thích' : 'Yêu thích'}</span>
          </div>
          <div className="action-item">
            <button className="circle-btn"><IoShareSocialOutline color="#1A73E8" /></button>
            <span>Chia sẻ</span>
          </div>

          <div className="action-item" onClick={() => setShowEditModal(true)}>
            <button className="circle-btn"><IoCreateOutline color="#1A73E8" /></button>
            <span>Sửa đổi</span>
          </div>
        </div>

        <div className="details-list">
           <div className="detail-item">
              <IoTimeOutline size={20} color="#5F6368" />
              <span>{location.open_time ? `${location.open_time.slice(0,5)} - ${location.close_time.slice(0,5)}` : "Open"}</span>
           </div>
           <div className="detail-item">
              <IoLocationOutline size={20} color="#5F6368" />
              <span>{location.address}</span>
           </div>
           {location.describe && (
               <div className="detail-item">
                  {/* Bạn có thể dùng icon khác hoặc dùng lại icon info */}
                  <IoInformationCircleOutline size={20} color="#746f6e" /> 
                  <span style={{ fontStyle: 'italic', color: '#555' }}>
                     Mo ta: {location.describe}
                  </span>
               </div>
           )}
        </div>

        <hr className="divider" />

        <div className="reviews-section">
            <h3>Bình luận & Đánh giá</h3>

            {/* --- 4. FORM VIẾT BÌNH LUẬN --- */}
            {currentUser ? (
              <div className="write-review-box">
                 <div className="user-curr-info">
                    <IoPersonCircle size={30} color="#1A73E8"/> 
                    <span>{currentUser.full_name || currentUser.username}</span>
                 </div>
                 
                 <div className="rating-input">
                    {renderInputStars()}
                    <span className="rating-text">{newRating} sao</span>
                 </div>

                 <form onSubmit={handleSubmitReview}>
                    <textarea 
                      className="review-input" 
                      placeholder="Chia sẻ trải nghiệm của bạn về địa điểm này..."
                      rows="3"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    ></textarea>
                    <button type="submit" className="btn-send-review" disabled={submitting}>
                      {submitting ? 'Đang gửi...' : <><IoSend /> Gửi đánh giá</>}
                    </button>
                 </form>
              </div>
            ) : (
              <div className="login-prompt">
                 <p>Vui lòng đăng nhập để viết đánh giá.</p>
              </div>
            )}
            {/* ----------------------------- */}
            
            {loadingReviews ? (
                <p>Đang tải bình luận...</p>
            ) : reviews.length === 0 ? (
                <p className="no-reviews">Chưa có đánh giá nào.</p>
            ) : (
                <div className="review-list">
                    {reviews.map(review => (
                        <div key={review.id} className="review-item">
                            <div className="review-header">
                                <div className="user-info">
                                    <IoPersonCircle size={32} color="#ccc" /> 
                                    <span className="user-name">{review.user_name || "User"}</span>
                                </div>
                                <span className="review-date">{formatDate(review.created_at)}</span>
                            </div>
                            <div className="review-stars">{renderStars(review.rating)}</div>
                            <p className="review-content">{review.content}</p>
                        </div>
                    ))}
                </div>
            )}

            {showEditModal && (
            <EditRequestModal 
                store={location} 
                onClose={() => setShowEditModal(false)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationPanel;