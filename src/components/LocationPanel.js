import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EditRequestModal from './EditRequestModal';
import { 
  IoStar, IoStarHalf, IoNavigate, IoCallOutline, 
  IoHeart, IoHeartOutline, IoShareSocialOutline, 
  IoTimeOutline, IoLocationOutline, IoClose,
  IoChevronBack, IoChevronForward, IoPersonCircle, IoSend,
  IoInformationCircleOutline, IoCreateOutline, IoMailOutline
} from "react-icons/io5";

const LocationPanel = ({ location, onClose, isFavorite, onToggleFavorite, onDirections }) => {
  const { currentUser, authFetch } = useAuth();

  // --- STATES ---
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // State form bình luận
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // State Modal con
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // --- EFFECT: Reset & Load Data ---
  useEffect(() => {
    setCurrentImageIndex(0);
    setReviews([]); 
    setNewRating(5); 
    setNewComment("");
    
    if (location?.id) {
      fetchReviews(location.id);
    }
  }, [location]);

  // --- API HELPER: Lấy bình luận ---
  const fetchReviews = async (storeId) => {
    setLoadingReviews(true);
    try {
      // API này cần backend hỗ trợ filter ?store=ID
      const res = await fetch(`http://127.0.0.1:8000/api/reviews/?store=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        setReviews(results);
      }
    } catch (err) {
      console.error("Lỗi tải bình luận:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // --- API HELPER: Gửi bình luận ---
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) { alert("Vui lòng nhập nội dung!"); return; }

    setSubmitting(true);
    try {
      const payload = {
        store: location.id,
        rating: newRating,
        content: newComment,
        describe: location.describe // Trường này có thể dư thừa tùy backend
      };

      const res = await authFetch('http://127.0.0.1:8000/api/reviews/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newReviewData = await res.json();
        // Thêm review mới lên đầu danh sách (giả lập UI update ngay)
        setReviews([newReviewData, ...reviews]);
        setNewComment("");
        setNewRating(5);
        alert("Đánh giá thành công!");
      } else {
        alert("Lỗi! Có thể bạn đã đánh giá địa điểm này rồi.");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- HELPERS: Render UI ---
  const images = (location.images && location.images.length > 0) 
      ? location.images 
      : [{ id: 'def', image: "https://via.placeholder.com/400x250?text=No+Image" }];
  
  const currentImageSrc = images[currentImageIndex].image;

  // Next/Prev ảnh trên slider chính
  const nextImage = (e) => { e?.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % images.length); };
  const prevImage = (e) => { e?.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length); };

  // Next/Prev ảnh trên Modal Lightbox
  const handleModalNext = (e) => {
    e.stopPropagation();
    if (!selectedImage) return;
    const currIdx = images.findIndex(img => img.id === selectedImage.id);
    const nextIdx = (currIdx + 1) % images.length;
    setSelectedImage(images[nextIdx]);
  };

  const handleModalPrev = (e) => {
    e.stopPropagation();
    if (!selectedImage) return;
    const currIdx = images.findIndex(img => img.id === selectedImage.id);
    const prevIdx = (currIdx - 1 + images.length) % images.length;
    setSelectedImage(images[prevIdx]);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) stars.push(<IoStar key={i} color="#F4B400" size={14} />);
      else if (rating >= i - 0.5) stars.push(<IoStarHalf key={i} color="#F4B400" size={14} />);
      else stars.push(<IoStar key={i} color="#E0E0E0" size={14} />);
    }
    return stars;
  };

  if (!location) return null;

  return (
    <div className="location-panel">
      {/* Nút đóng Panel chính */}
      <button className="close-btn" onClick={onClose}><IoClose size={24}/></button>
      
      {/* --- PHẦN 1: SLIDER ẢNH --- */}
      <div className="location-image-container">
        <img 
            src={currentImageSrc} 
            alt={location.name} 
            className="main-img" 
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedImage(images[currentImageIndex])} // Mở Modal khi click
        />
        {images.length > 1 && (
          <>
            <button className="img-nav-btn prev" onClick={prevImage}><IoChevronBack size={18}/></button>
            <button className="img-nav-btn next" onClick={nextImage}><IoChevronForward size={18}/></button>
            <div className="img-counter">{currentImageIndex + 1} / {images.length}</div>
          </>
        )}
      </div>

      <div className="panel-content">
        {/* --- PHẦN 2: THÔNG TIN CHÍNH --- */}
        <h1 className="location-title">{location.name}</h1>
        
        <div className="rating-row">
          <span className="rating-num">{location.rating_avg ? parseFloat(location.rating_avg).toFixed(1) : 0}</span>
          <div className="stars">{renderStars(location.rating_avg || 0)}</div>
          <span className="reviews">({location.rating_count || 0} đánh giá)</span>
        </div>
        
        <p className="category" style={{color: '#666', fontSize: '13px'}}>
            {location.category_name || "Địa điểm"} • {location.state === 'public' ? "Công khai" : "Đang chờ duyệt"}
        </p>

        {/* --- PHẦN 3: NÚT HÀNH ĐỘNG --- */}
        <div className="actions-row">
          <div className="action-item" onClick={onDirections}> 
            <button className="circle-btn blue">
                <IoNavigate color="#fff" />
            </button>
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
             <span style={{ color: isFavorite ? '#EA4335' : '#333' }}>{isFavorite ? 'Đã thích' : 'Lưu'}</span>
          </div>
          <div className="action-item">
            <button className="circle-btn"><IoShareSocialOutline color="#1A73E8" /></button>
            <span>Chia sẻ</span>
          </div>
          <div className="action-item" onClick={() => setShowEditModal(true)}>
            <button className="circle-btn"><IoCreateOutline color="#1A73E8" /></button>
            <span>Chỉnh sửa</span>
          </div>
        </div>

        {/* --- PHẦN 4: CHI TIẾT --- */}
        <div className="details-list">

           <div className="detail-item" style={{display:'flex', gap:10, marginBottom:10, alignItems:'center'}}>
              <IoTimeOutline size={20} color="#5F6368" />
              <span>{location.open_time ? `${location.open_time.slice(0,5)} - ${location.close_time.slice(0,5)}` : "Đang cập nhật giờ"}</span>
           </div>

           <div className="detail-item" style={{display:'flex', gap:10, marginBottom:10, alignItems:'center'}}>
              <IoLocationOutline size={20} color="#5F6368" />
              <span>{location.address}</span>
           </div>

           {/* Số điện thoại (Chỉ hiện nếu có) */}
           {location.phone && (
               <div className="detail-item" style={{display:'flex', gap:10, marginBottom:10, alignItems:'center'}}>
                  <IoCallOutline size={20} color="#5F6368" />
                  <span>{location.phone}</span>
               </div>
           )}

           {/* Email (Chỉ hiện nếu có) */}
           {location.email && (
               <div className="detail-item" style={{display:'flex', gap:10, marginBottom:10, alignItems:'center'}}>
                  <IoMailOutline size={20} color="#5F6368" />
                  <span>{location.email}</span>
               </div>
           )}

           {location.describe && (
               <div className="detail-item" style={{display:'flex', gap:10, marginBottom:10}}>
                  <IoInformationCircleOutline size={20} color="#5F6368" style={{minWidth:20}} /> 
                  <span style={{ fontStyle: 'italic', color: '#555', lineHeight: 1.4 }}>
                     {location.describe}
                  </span>
               </div>
           )}
        </div>

        <hr className="divider" style={{border:'none', borderTop:'1px solid #eee', margin:'20px 0'}} />

        {/* --- PHẦN 5: BÌNH LUẬN --- */}
        <div className="reviews-section">
            <h3 style={{fontSize: 18, marginBottom: 15}}>Đánh giá từ cộng đồng</h3>

            {/* Form viết đánh giá */}
            {currentUser ? (
              <div className="write-review-box">
                 <div className="user-curr-info">
                    <IoPersonCircle size={24} color="#1A73E8"/> 
                    <span>{currentUser.full_name || currentUser.username}</span>
                 </div>
                 
                 <div className="rating-input">
                    {[1,2,3,4,5].map(star => (
                        <IoStar 
                            key={star} size={22} 
                            color={star <= newRating ? "#F4B400" : "#E0E0E0"} 
                            style={{cursor:'pointer', marginRight:4}}
                            onClick={() => setNewRating(star)}
                        />
                    ))}
                    <span className="rating-text">{newRating}/5</span>
                 </div>

                 <form onSubmit={handleSubmitReview}>
                    <textarea 
                      className="review-input" 
                      placeholder="Chia sẻ trải nghiệm của bạn..."
                      rows="3"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    ></textarea>
                    <button type="submit" className="btn-send-review" disabled={submitting}>
                      {submitting ? 'Đang gửi...' : <><IoSend /> Đăng bài</>}
                    </button>
                    <div style={{clear:'both'}}></div>
                 </form>
              </div>
            ) : (
              <div style={{textAlign:'center', padding:20, background:'#f1f3f4', borderRadius:8}}>
                 <p>Vui lòng đăng nhập để viết đánh giá.</p>
              </div>
            )}
            
            {/* Danh sách bình luận */}
            {loadingReviews ? (
                <p style={{textAlign:'center', color:'#999'}}>Đang tải...</p>
            ) : reviews.length === 0 ? (
                <p className="no-reviews" style={{textAlign:'center', color:'#999'}}>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
            ) : (
                <div className="review-list">
                    {reviews.map(review => (
                        <div key={review.id} className="review-item">
                            <div className="review-header">
                                <div className="user-info">
                                    <IoPersonCircle size={28} color="#999" /> 
                                    <span className="user-name">{review.user_name || "Ẩn danh"}</span>
                                </div>
                                <span className="review-date">{new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="review-stars">{renderStars(review.rating)}</div>
                            <p className="review-content">{review.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* --- MODAL XEM ẢNH CHI TIẾT (LIGHTBOX) --- */}
      {selectedImage && (
        <div className="image-detail-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedImage(null)}>
                <IoClose size={24} />
            </button>
            
            {/* Cột Trái: Ảnh */}
            <div className="modal-image-col">
                {images.length > 1 && (
                    <>
                        <button className="modal-nav-btn prev" onClick={handleModalPrev}><IoChevronBack size={36} /></button>
                        <button className="modal-nav-btn next" onClick={handleModalNext}><IoChevronForward size={36} /></button>
                    </>
                )}
                <img src={selectedImage.image} alt="Chi tiết" />
            </div>

            {/* Cột Phải: Thông tin ảnh */}
            <div className="modal-info-col">
                <h3>Chi tiết hình ảnh</h3>
                
                <div className="info-item">
                    <strong>Mô tả:</strong>
                    <p>{selectedImage.describe || "Không có mô tả."}</p>
                </div>

                <div className="info-item">
                    <strong>Người đăng:</strong>
                    <div className="uploader-badge">
                        <IoPersonCircle size={18} /> 
                        <span>{selectedImage.uploaded_by_name || "Người dùng"}</span>
                    </div>
                </div>

                <div className="info-item">
                    <strong>Trạng thái:</strong>
                    <span className={`status-tag ${selectedImage.state || 'public'}`}>
                        {selectedImage.state === 'private' ? 'Riêng tư' : 'Công khai'}
                    </span>
                </div>

                <div className="info-item">
                    <strong>Ngày đăng:</strong>
                    <div className="time-badge">
                       <IoTimeOutline /> 
                       <span>{selectedImage.time_up || "N/A"}</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CHỈNH SỬA --- */}
      {showEditModal && (
        <EditRequestModal 
            store={location} 
            onClose={() => setShowEditModal(false)} 
        />
      )}
    </div>
  );
};

export default LocationPanel;