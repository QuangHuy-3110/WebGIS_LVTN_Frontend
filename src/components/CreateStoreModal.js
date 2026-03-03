import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { IoClose, IoCloudUploadOutline, IoPaperPlane } from "react-icons/io5";

// Import Leaflet
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationPicker = ({ setPos }) => {
    useMapEvents({
        click(e) { if (e && e.latlng) setPos({ lat: e.latlng.lat, lng: e.latlng.lng }); },
    });
    return null;
};

// Component giúp bản đồ tự động bay đến vị trí mới khi coordinates thay đổi
const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => { map.invalidateSize(); }, 200);
        if (lat && lng) { 
            map.flyTo([lat, lng], 16); // Dùng flyTo cho mượt
        }
    }, [lat, lng, map]);
    return null;
};

const CreateStoreModal = ({ onClose }) => {
    const { authFetch } = useAuth();
    const [activeTab, setActiveTab] = useState('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State lưu danh mục
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '',
        open_time: '', close_time: '', describe: '', 
        category: '' 
    });

    const [position, setPosition] = useState({ lat: 10.045, lng: 105.746 });

    // Kéo thả marker
    const markerRef = useRef(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                const { lat, lng } = marker.getLatLng();
                setPosition({ lat, lng });
            }
        },
    }), []);

    // Load danh mục
    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/categories/')
            .then(res => res.json())
            .then(data => {
                const result = data.results || data;
                setCategories(result);
                if (result.length > 0) {
                    setFormData(prev => ({ ...prev, category: result[0].id }));
                }
            })
            .catch(err => console.error("Lỗi tải danh mục:", err));
    }, []);

    const [newImagesData, setNewImagesData] = useState([]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // --- [SỬA ĐỔI] HÀM XỬ LÝ CHỌN ẢNH VÀ TỰ ĐỘNG LẤY GPS ---
    const handleFileSelect = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            
            // 1. Thêm ảnh vào danh sách hiển thị (Logic cũ)
            const newFiles = files.map(file => ({ file, describe: "" }));
            setNewImagesData([...newImagesData, ...newFiles]);

            // 2. [MỚI] Lấy file đầu tiên để phân tích GPS
            const firstFile = files[0];
            
            // Chỉ gọi API nếu chưa có địa chỉ hoặc người dùng muốn (để tránh ghi đè nếu họ đang nhập dở)
            // Ở đây mình cứ gọi luôn để demo tính năng tự động
            const data = new FormData();
            data.append('image', firstFile);

            try {
                // Hiển thị loading nhẹ (tùy chọn)
                console.log("⏳ Đang phân tích GPS từ ảnh...");
                
                // Gọi API backend chúng ta đã viết (AnalyzeImageView)
                const response = await fetch('http://127.0.0.1:8000/api/utils/analyze-image/', {
                    method: 'POST',
                    body: data,
                    // Lưu ý: Không cần headers Content-Type, trình duyệt tự gán boundary cho FormData
                });

                const result = await response.json();

                if (result.latitude && result.longitude) {
                    // Cập nhật Marker trên bản đồ
                    setPosition({ lat: result.latitude, lng: result.longitude });
                    
                    // Cập nhật ô địa chỉ
                    setFormData(prev => ({ 
                        ...prev, 
                        address: result.address || prev.address 
                    }));

                    alert(`📍 Đã tìm thấy vị trí từ ảnh!\nĐịa chỉ: ${result.address}`);
                } 
            } catch (error) {
                console.error("Lỗi khi lấy GPS từ ảnh:", error);
                // Không làm gì cả nếu lỗi, để người dùng nhập tay
            }
        }
    };
    // --------------------------------------------------------
    
    const handleImageDescribeChange = (index, text) => {
        const updated = [...newImagesData]; updated[index].describe = text; setNewImagesData(updated);
    };
    
    const removeNewImage = (index) => setNewImagesData(newImagesData.filter((_, i) => i !== index));

    const handleSubmit = async () => {
        if (!formData.name || !formData.address) {
            alert("Vui lòng nhập Tên quán và Địa chỉ!"); return;
        }

        setIsSubmitting(true);
        try {
            // Bước 1: Tạo Store
            const storePayload = {
                ...formData,
                category: parseInt(formData.category), 
                location: { type: "Point", coordinates: [position.lng, position.lat] }
            };

            const storeRes = await authFetch('http://127.0.0.1:8000/api/stores/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storePayload)
            });

            if (!storeRes.ok) throw new Error("Lỗi khi tạo dữ liệu cửa hàng");
            const newStore = await storeRes.json();
            const newStoreId = newStore.id;

            // Bước 2: Upload Ảnh
            if (newImagesData.length > 0) {
                for (const item of newImagesData) {
                    const imgFormData = new FormData();
                    imgFormData.append('image', item.file);
                    imgFormData.append('store', newStoreId);
                    imgFormData.append('describe', item.describe || 'Hình ảnh đề xuất');
                    
                    await authFetch('http://127.0.0.1:8000/api/store-images/', {
                        method: 'POST', body: imgFormData
                    });
                }
            }

            // Bước 3: Tạo Hồ sơ duyệt
            const noteData = {
                action: "CREATE_NEW",
                store_name: formData.name,
                category_name: categories.find(c => c.id === formData.category)?.name || "N/A",
                created_at: new Date().toISOString()
            };

            const approvalRes = await authFetch('http://127.0.0.1:8000/api/approvals/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store: newStoreId,
                    status: 'pending',
                    note: JSON.stringify(noteData)
                })
            });

            if (approvalRes.ok) {
                alert("✅ Đã gửi hồ sơ thành công! Vui lòng chờ Admin duyệt.");
                onClose();
            }

        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="edit-modal-content">
                <div className="modal-header">
                    <h2>Đề xuất mở địa điểm mới</h2>
                    <button onClick={onClose}><IoClose size={24}/></button>
                </div>

                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`} onClick={() => setActiveTab('images')}>Hình ảnh</button>
                    <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Thông tin</button>
                    <button className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>Vị trí</button>
                </div>

                <div className="modal-body-scroll">
                    {/* TAB INFO */}
                    {activeTab === 'info' && (
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Tên địa điểm (*)</label>
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="VD: Cà phê View Sông..." />
                            </div>

                            <div className="form-group">
                                <label>Loại hình (*)</label>
                                <select 
                                    name="category" 
                                    value={formData.category} 
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '8px', 
                                        borderRadius: '4px', border: '1px solid #ccc',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group"><label>Số điện thoại</label><input name="phone" value={formData.phone} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Email</label><input name="email" value={formData.email} onChange={handleChange} /></div>
                            
                            {/* Ô ĐỊA CHỈ SẼ TỰ ĐỘNG ĐIỀN */}
                            <div className="form-group full-width">
                                <label>Địa chỉ (*)</label>
                                <input 
                                    name="address" 
                                    value={formData.address} 
                                    onChange={handleChange} 
                                    placeholder="Chọn ảnh có GPS ở tab Hình ảnh để tự động điền..."
                                />
                            </div>
                            
                            <div className="form-group"><label>Giờ mở cửa</label><input type="time" name="open_time" value={formData.open_time} onChange={handleChange} /></div>
                            <div className="form-group"><label>Giờ đóng cửa</label><input type="time" name="close_time" value={formData.close_time} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Mô tả / Giới thiệu</label><textarea rows="3" name="describe" value={formData.describe} onChange={handleChange} /></div>
                        </div>
                    )}

                    {activeTab === 'location' && (
                        <div className="location-edit-tab">
                             <p style={{marginBottom: 10, color: '#d93025'}}>* Kéo thả ghim đỏ đến vị trí chính xác (Hoặc upload ảnh để tự định vị).</p>
                            <div className="mini-map-container" style={{height: '350px'}}>
                                <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {/* Component tự động recenter khi position thay đổi */}
                                    <RecenterAutomatically lat={position.lat} lng={position.lng} />
                                    <Marker position={position} draggable={true} eventHandlers={eventHandlers} ref={markerRef} />
                                    <LocationPicker setPos={setPosition} />
                                </MapContainer>
                            </div>
                            <div style={{marginTop: 10, textAlign: 'center'}}>
                                Toạ độ: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                            </div>
                        </div>
                    )}

                    {activeTab === 'images' && (
                        <div className="image-manager">
                            <div className="upload-zone">
                                <label className="upload-btn-label">
                                    <IoCloudUploadOutline size={24} /> <span>Tải ảnh lên (Minh chứng)</span>
                                    {/* Input file gọi handleFileSelect */}
                                    <input type="file" multiple onChange={handleFileSelect} style={{display:'none'}} />
                                </label>
                                <p style={{fontSize: '0.9em', color: '#666', marginTop: '5px'}}>
                                    * Mẹo: Chọn ảnh chụp tại quán (có bật GPS) để tự động điền vị trí và địa chỉ.
                                </p>
                                <div className="new-images-list">
                                    {newImagesData.map((item, index) => (
                                        <div key={index} className="new-img-row">
                                            <span className="file-name">{item.file.name}</span>
                                            <input className="img-describe-input" placeholder="Chú thích ảnh..." value={item.describe} onChange={(e) => handleImageDescribeChange(index, e.target.value)} />
                                            <button className="btn-remove-img" onClick={() => removeNewImage(index)}><IoClose /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <IoPaperPlane /> 
                        {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu duyệt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateStoreModal;