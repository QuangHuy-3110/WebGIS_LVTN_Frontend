import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { IoClose, IoCloudUploadOutline, IoPaperPlane, IoSwapHorizontal } from "react-icons/io5";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const LocationPicker = ({ setPos }) => {
    useMapEvents({ click(e) { if (e && e.latlng) setPos({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
    return null;
};
const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 200);
        if (lat && lng) map.flyTo([lat, lng], 16);
    }, [lat, lng, map]);
    return null;
};

// ============================================================
// Dialog chọn / đổi biển hiệu
// ============================================================
const SignSelectionDialog = ({ signs, currentIndex, onConfirm, onCancel }) => {
    const [selectedIndex, setSelectedIndex] = useState(
        currentIndex !== null ? currentIndex : (signs[0]?.index ?? 0)
    );

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px',
        }}>
            <div style={{
                background: '#fff', borderRadius: '14px', padding: '24px',
                maxWidth: '660px', width: '100%', maxHeight: '88vh', overflowY: 'auto',
                boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2d3d' }}>
                        🏪 Tìm thấy <b style={{ color: '#e74c3c' }}>{signs.length}</b> biển hiệu — Chọn biển hiệu cần trích xuất:
                    </h3>
                    <button onClick={onCancel}
                        style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
                </div>

                {/* Sign cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
                    gap: '12px', marginBottom: '20px',
                }}>
                    {signs.map((sign, i) => {
                        const isSelected   = sign.index === selectedIndex;
                        const isCurrent    = sign.index === currentIndex;
                        const confColor    = sign.conf >= 0.85 ? '#27ae60' : sign.conf >= 0.70 ? '#f39c12' : '#e74c3c';
                        return (
                            <div key={sign.index} onClick={() => setSelectedIndex(sign.index)}
                                style={{
                                    border: `3px solid ${isSelected ? '#3498db' : '#ddd'}`,
                                    borderRadius: '10px', padding: '10px', cursor: 'pointer',
                                    textAlign: 'center', transition: 'all 0.18s',
                                    background: isSelected ? '#ebf5fb' : '#f9f9f9',
                                    position: 'relative',
                                }}>
                                {/* Badge "Đang dùng" cho lựa chọn hiện tại */}
                                {isCurrent && (
                                    <div style={{
                                        position: 'absolute', top: '-8px', left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: '#8e44ad', color: 'white',
                                        fontSize: '10px', fontWeight: 700,
                                        padding: '2px 8px', borderRadius: '10px',
                                        whiteSpace: 'nowrap',
                                    }}>✔ Đang dùng</div>
                                )}
                                <img src={sign.preview} alt={`Biển ${i + 1}`}
                                    style={{
                                        width: '100%', height: '110px', objectFit: 'contain',
                                        borderRadius: '6px', display: 'block', marginBottom: '8px', background: '#eee',
                                    }} />
                                <span style={{
                                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                                    fontSize: '12px', fontWeight: 700,
                                    background: confColor, color: 'white',
                                }}>
                                    Biển {i + 1}: {sign.conf_pct}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Confirm */}
                <button onClick={() => onConfirm(selectedIndex)}
                    disabled={selectedIndex === currentIndex}
                    style={{
                        width: '100%', padding: '12px',
                        background: selectedIndex === currentIndex ? '#bdc3c7' : '#2980b9',
                        color: 'white', border: 'none', borderRadius: '8px',
                        fontSize: '14px', fontWeight: 700,
                        cursor: selectedIndex === currentIndex ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                    }}>
                    {selectedIndex === currentIndex
                        ? '⚠️ Vui lòng chọn biển hiệu khác'
                        : '✅ Xác nhận đổi sang biển hiệu này'}
                </button>
            </div>
        </div>
    );
};

// ============================================================
// Chip hiển thị biển hiệu đang dùng + nút đổi
// ============================================================
const ActiveSignChip = ({ signs, currentIndex, onChangeRequest, isLoading }) => {
    if (!signs || signs.length <= 1 || currentIndex === null) return null;
    const active = signs.find(s => s.index === currentIndex);
    if (!active) return null;
    const confColor = active.conf >= 0.85 ? '#27ae60' : active.conf >= 0.70 ? '#f39c12' : '#e74c3c';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
            border: '1.5px solid #7dd3fc', borderRadius: '10px',
            padding: '10px 14px', marginBottom: '12px',
        }}>
            {/* Thumbnail ảnh biển hiệu đang dùng */}
            <img src={active.preview} alt="active sign"
                style={{
                    width: '52px', height: '40px', objectFit: 'contain',
                    borderRadius: '6px', border: '1px solid #bae6fd', background: '#f0f9ff',
                    flexShrink: 0,
                }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, marginBottom: '2px' }}>
                    📌 Biển hiệu đang được trích xuất
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: 700, background: confColor, color: 'white',
                    }}>
                        Biển {active.index + 1} — Độ tin cậy: {active.conf_pct}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                        / {signs.length} biển
                    </span>
                </div>
            </div>
            {/* Nút đổi */}
            <button onClick={onChangeRequest} disabled={isLoading}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: isLoading ? '#e2e8f0' : '#0284c7',
                    color: isLoading ? '#94a3b8' : 'white',
                    border: 'none', borderRadius: '8px',
                    padding: '8px 14px', fontSize: '12px', fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'background 0.2s',
                }}>
                <IoSwapHorizontal size={15} />
                {isLoading ? 'Đang xử lý...' : 'Đổi biển hiệu'}
            </button>
        </div>
    );
};

// ============================================================
// Hàm kiểm tra chuỗi có phải số điện thoại / địa chỉ không
// (dùng để lọc khỏi gợi ý ô Tên cửa hàng)
// ============================================================
const PHONE_RE   = /^[\d\s.\-+()]{7,}$|^0\d{8,9}$|^\+84\d{8,9}$/;
const ADDRESS_RE = /\d+\/\d*|(\bnguyễn\b|\btrần\b|\blê\b|\bvõ\b|\bphạm\b|\bhoàng\b|\bhuỳnh\b|\bđinh\b|\bphan\b)|\b(đường|phường|quận|xã|huyện|tp\.|thành phố|tỉnh|khu|ấp|thị trấn|nối dài|số \d)\b/i;

const isPhoneOrAddress = (text) => {
    if (!text) return false;
    const t = text.trim();
    if (PHONE_RE.test(t))   return true;  // trông như số điện thoại
    if (ADDRESS_RE.test(t)) return true;  // chứa từ khóa địa lý
    return false;
};

// ============================================================
// Main Modal
// ============================================================
const CreateStoreModal = ({ onClose }) => {
    const { authFetch } = useAuth();
    const [activeTab, setActiveTab]     = useState('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [categories, setCategories]   = useState([]);

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '',
        open_time: '', close_time: '', describe: '', category: '', state: 'active',
    });

    // ── Sign selection state ──────────────────────────────────────────────
    const [pendingSigns, setPendingSigns]       = useState(null);   // { signs, tmp_path, gps }
    const [selectedSignIdx, setSelectedSignIdx] = useState(null);   // index đang dùng
    const [showSignDialog, setShowSignDialog]   = useState(false);
    const [ocrApplied, setOcrApplied]           = useState(false);  // đã có kết quả OCR

    const [position, setPosition] = useState({ lat: 10.045, lng: 105.746 });
    const markerRef = useRef(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker) { const { lat, lng } = marker.getLatLng(); setPosition({ lat, lng }); }
        },
    }), []);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/categories/')
            .then(res => res.json())
            .then(data => {
                const result = data.results || data;
                setCategories(result);
                if (result.length > 0) setFormData(prev => ({ ...prev, category: result[0].id }));
            });
    }, []);

    const [newImagesData, setNewImagesData] = useState([]);
    const [zoomedImage, setZoomedImage]     = useState(null);
    // Gợi ý thông tin không rõ ràng từ OCR để hiển thị dưới ô Tên và Mô tả
    const [nameSuggestions, setNameSuggestions]         = useState([]);
    const [describeSuggestions, setDescribeSuggestions] = useState([]);


    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });


    // ── Apply extracted OCR data to form ─────────────────────────────────
    const applyOcrData = (data) => {
        const ci = data.contact_info || {};

        // 1. Cập nhật vị trí bản đồ
        if (data.latitude && data.longitude) setPosition({ lat: data.latitude, lng: data.longitude });

        // 2. Tự động điền các ô — chỉ điền khi ô đang trống
        setFormData(prev => ({
            ...prev,
            // Tên cửa hàng ← BRAND
            name:    !prev.name.trim()    ? (ci.brand?.[0]   || prev.name)    : prev.name,
            // Điện thoại ← PHONE (API trả về string "0xxx | 0yyy", không phải array)
            phone:   !prev.phone.trim()   ? (typeof ci.phone === 'string' ? ci.phone : (ci.phone?.[0] || '')) || prev.phone : prev.phone,
            // Email ← EMAIL
            email:   !prev.email.trim()   ? (ci.email?.[0]   || prev.email)   : prev.email,
            // Địa chỉ — ưu tiên: địa chỉ trên biển hiệu > suy luận từ GPS
            address: !prev.address.trim() ? (ci.address?.[0] || data.address_gps || prev.address) : prev.address,
            // Mô tả ← SERVICE (loại hình kinh doanh)
            describe: !prev.describe.trim() ? (ci.service?.[0] || prev.describe) : prev.describe,
        }));

        // 3. Danh mục
        if (data.category_id) setFormData(prev => ({ ...prev, category: data.category_id }));

        // 4. Gợi ý văn bản không rõ ràng (“O” + raw_texts)
        {
            const allOthers = [
                ...(ci.other || []),
                ...(data.raw_texts || []),
            ].filter((v, i, arr) => v && arr.indexOf(v) === i);

            // Gợi ý ô Mô tả: hiển thị tất cả
            setDescribeSuggestions(allOthers);

            // Gợi ý ô Tên: Lọc bỏ số điện thoại và địa chỉ ra
            const knownPhones   = new Set(ci.phone   || []);
            const knownAddresses = new Set(ci.address || []);
            setNameSuggestions(
                allOthers.filter(v => !knownPhones.has(v) && !knownAddresses.has(v) && !isPhoneOrAddress(v))
            );
        }

        // 5. Cập nhật tmp_path mới nhất (server trả về để dùng khi đổi biển)
        if (data.tmp_path && pendingSigns) {
            setPendingSigns(prev => ({ ...prev, tmp_path: data.tmp_path }));
        }

        setOcrApplied(true);
    };



    // ── Handle file select ────────────────────────────────────────────────
    const handleFileSelect = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setNewImagesData(prev => [...prev, ...files.map(f => ({
            file: f, describe: '', previewUrl: URL.createObjectURL(f),
        }))]);

        // Reset sign selection và suggestions khi upload ảnh mới
        setPendingSigns(null);
        setSelectedSignIdx(null);
        setOcrApplied(false);
        setNameSuggestions([]);
        setDescribeSuggestions([]);



        const fd = new FormData();
        fd.append('image', files[0]);
        setIsAnalyzing(true);
        // AbortController với timeout 5 phút — đủ để Qwen CPU chạy xong
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 5 * 60 * 1000);
        try {
            const resp   = await fetch('http://127.0.0.1:8000/api/utils/quick-upload/', {
                method: 'POST', body: fd, signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!resp.ok) throw new Error(`Server trả về lỗi ${resp.status}`);
            const result = await resp.json();

            if (result.multiple_signs && result.signs?.length > 1) {
                setPendingSigns({ signs: result.signs, tmp_path: result.tmp_path, gps: result.gps });
                setShowSignDialog(true);
            } else {
                applyOcrData(result);
            }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                alert('⏰ Phân tích AI quá 5 phút, vui lòng thử lại. (Server AI có thể đang bị quá tải)');
            } else {
                console.error('Upload error:', err);
                alert('⚠️ Lỗi kết nối tới server: ' + err.message + '\nVui lòng kiểm tra server AI (port 5050) và thử lại.');
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ── Confirm sign selection ──────────────────────────────────────────────
    const handleConfirmSign = async (boxIndex) => {
        if (!pendingSigns) return;
        setShowSignDialog(false);
        setSelectedSignIdx(boxIndex);
        setIsAnalyzing(true);
        try {
            const resp = await authFetch('http://127.0.0.1:8000/api/utils/analyze-sign/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tmp_path: pendingSigns.tmp_path, box_index: boxIndex }),
            });
            const data = await resp.json();

            // Merge GPS
            if (pendingSigns.gps) {
                if (!data.latitude   && pendingSigns.gps.latitude)    data.latitude    = pendingSigns.gps.latitude;
                if (!data.longitude  && pendingSigns.gps.longitude)   data.longitude   = pendingSigns.gps.longitude;
                if (!data.address_gps && pendingSigns.gps.address_gps) data.address_gps = pendingSigns.gps.address_gps;
            }

            // Cập nhật tmp_path mới nhất từ server
            if (data.tmp_path) {
                setPendingSigns(prev => ({ ...prev, tmp_path: data.tmp_path }));
            }

            applyOcrData(data);
        } catch (err) {
            console.error('Analyze sign error:', err);
            alert('Có lỗi khi phân tích biển hiệu. Vui lòng thử lại.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleChangeSignRequest = () => setShowSignDialog(true);

    const handleImageDescribeChange = (index, text) => {
        const updated = [...newImagesData];
        updated[index].describe = text;
        setNewImagesData(updated);
    };

    const removeNewImage = (index) => {
        URL.revokeObjectURL(newImagesData[index].previewUrl);
        setNewImagesData(newImagesData.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.address) { alert('Vui lòng nhập Tên quán và Địa chỉ!'); return; }
        setIsSubmitting(true);
        try {
            const storeRes = await authFetch('http://127.0.0.1:8000/api/stores/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData, category: parseInt(formData.category),
                    location: { type: "Point", coordinates: [position.lng, position.lat] },
                }),
            });
            if (!storeRes.ok) throw new Error('Lỗi khi tạo dữ liệu cửa hàng');
            const newStore = await storeRes.json();

            for (const item of newImagesData) {
                const imgFd = new FormData();
                imgFd.append('image', item.file);
                imgFd.append('store', newStore.id);
                imgFd.append('describe', item.describe || 'Hình ảnh đề xuất');
                await authFetch('http://127.0.0.1:8000/api/store-images/', { method: 'POST', body: imgFd });
            }

            await authFetch('http://127.0.0.1:8000/api/approvals/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store: newStore.id, status: 'pending', note: JSON.stringify({ action: 'CREATE_NEW' }) }),
            });

            alert('✅ Đã gửi hồ sơ thành công! Vui lòng chờ Admin duyệt.');
            onClose();
        } catch (err) {
            alert('Có lỗi xảy ra: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <>
            <div className="modal-overlay">
                <div className="edit-modal-content" style={{ maxWidth: '700px' }}>

                    <div className="modal-header">
                        <h2>Đề xuất mở địa điểm mới</h2>
                        <button onClick={onClose}><IoClose size={24} /></button>
                    </div>

                    {/* Analyzing banner */}
                    {isAnalyzing && (
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white', padding: '10px 16px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            fontSize: '13px', fontWeight: 600,
                        }}>
                            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                            Đang phân tích biển hiệu bằng AI (YOLO + VietOCR + Qwen LLM)... Vui lòng chờ.
                        </div>
                    )}

                    <div className="tabs">
                        <button className={`tab-btn ${activeTab === 'images'   ? 'active' : ''}`} onClick={() => setActiveTab('images')}>Hình ảnh</button>
                        <button className={`tab-btn ${activeTab === 'info'     ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Thông tin</button>
                        <button className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>Vị trí</button>
                    </div>

                    <div className="modal-body-scroll">

                        {/* ── Chip biển hiệu đang dùng (hiển thị mọi tab) ─── */}
                        <ActiveSignChip
                            signs={pendingSigns?.signs}
                            currentIndex={selectedSignIdx}
                            onChangeRequest={handleChangeSignRequest}
                            isLoading={isAnalyzing}
                        />

                        {/* ── Preview ảnh đã chọn (hiển thị mọi tab) ──────── */}
                        {newImagesData.length > 0 && (
                            <div style={{
                                background: '#f8f9fa', border: '1px solid #e0e0e0',
                                borderRadius: '8px', padding: '10px 12px', marginBottom: '12px',
                            }}>
                                <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '8px', fontWeight: 600 }}>
                                    📷 Ảnh đã chọn ({newImagesData.length})
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {newImagesData.map((item, index) => (
                                        <div key={index} style={{ position: 'relative', width: '72px', height: '72px' }}>
                                            <img src={item.previewUrl} alt={item.file.name}
                                                onClick={() => setZoomedImage(item.previewUrl)}
                                                style={{
                                                    width: '72px', height: '72px', objectFit: 'cover',
                                                    borderRadius: '6px', cursor: 'zoom-in',
                                                    border: '2px solid #ddd',
                                                }} />
                                            <button onClick={() => removeNewImage(index)}
                                                style={{
                                                    position: 'absolute', top: '-6px', right: '-6px',
                                                    background: '#e53e3e', color: 'white', border: 'none',
                                                    borderRadius: '50%', width: '18px', height: '18px',
                                                    cursor: 'pointer', fontSize: '10px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Tab: INFO ──────────────────────────────────────── */}
                        {activeTab === 'info' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Tên địa điểm (*)</label>
                                    <input name="name" value={formData.name} onChange={handleChange} />
                                    {/* Gợi ý văn bản không rõ từ OCR — click để điền vào ô tên */}
                                    {nameSuggestions.length > 0 && (
                                        <div style={{ marginTop: '5px' }}>
                                            <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                                                💡 Văn bản từ biển hiệu — Click để điền:
                                            </span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {nameSuggestions.map((text, i) => (
                                                    <button key={i} type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, name: text }))}
                                                        style={{
                                                            padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                                                            background: '#eff6ff', color: '#1d4ed8',
                                                            border: '1px solid #bfdbfe', borderRadius: '10px',
                                                            cursor: 'pointer', transition: 'all 0.15s',
                                                        }}
                                                        onMouseEnter={e => { e.target.style.background = '#dbeafe'; }}
                                                        onMouseLeave={e => { e.target.style.background = '#eff6ff'; }}
                                                        title={`Click để điền "${text}" vào ô tên`}
                                                    >
                                                        {text}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Loại hình (*)</label>
                                    <select name="category" value={formData.category} onChange={handleChange}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Trạng thái</label>
                                    <select name="state" value={formData.state} onChange={handleChange}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="form-group"><label>Điện thoại</label><input name="phone" value={formData.phone} onChange={handleChange} /></div>
                                <div className="form-group full-width"><label>Email</label><input name="email" value={formData.email} onChange={handleChange} /></div>
                                <div className="form-group full-width">
                                    <label>Địa chỉ (*)</label>
                                    <input name="address" value={formData.address} onChange={handleChange}
                                        placeholder="Upload ảnh GPS để điền tự động..." />
                                </div>
                                <div className="form-group"><label>Giờ mở cửa</label><input type="time" name="open_time" value={formData.open_time} onChange={handleChange} /></div>
                                <div className="form-group"><label>Giờ đóng cửa</label><input type="time" name="close_time" value={formData.close_time} onChange={handleChange} /></div>
                                <div className="form-group full-width">
                                    <label>Mô tả</label>
                                    <textarea rows="3" name="describe" value={formData.describe} onChange={handleChange} />
                                    {/* Gợi ý thông tin phụ từ OCR (slogan, chứng chỉ...) */}
                                    {describeSuggestions.length > 0 && (
                                        <div style={{ marginTop: '6px' }}>
                                            <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                💡 Thông tin phụ từ biển hiệu — Click để thêm vào mô tả:
                                            </span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                {describeSuggestions.map((text, i) => (
                                                    <button key={i} type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            describe: prev.describe
                                                                ? prev.describe.trim() + ' | ' + text
                                                                : text
                                                        }))}
                                                        style={{
                                                            padding: '3px 9px', fontSize: '11px', fontWeight: 600,
                                                            background: '#f5f3ff', color: '#5b21b6',
                                                            border: '1px solid #c4b5fd', borderRadius: '12px',
                                                            cursor: 'pointer', transition: 'all 0.15s',
                                                        }}
                                                        onMouseEnter={e => { e.target.style.background = '#ede9fe'; }}
                                                        onMouseLeave={e => { e.target.style.background = '#f5f3ff'; }}
                                                        title="Click để thêm vào ô mô tả"
                                                    >
                                                        + {text}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Tab: LOCATION ──────────────────────────────────── */}
                        {activeTab === 'location' && (
                            <div className="location-edit-tab">
                                <p style={{ marginBottom: 10, color: '#d93025' }}>* Kéo thả ghim đỏ để chọn vị trí chính xác.</p>
                                <div className="mini-map-container" style={{ height: '350px' }}>
                                    <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <RecenterAutomatically lat={position.lat} lng={position.lng} />
                                        <Marker position={position} draggable eventHandlers={eventHandlers} ref={markerRef} />
                                        <LocationPicker setPos={setPosition} />
                                    </MapContainer>
                                </div>
                                <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#555' }}>
                                    Toạ độ: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                                </div>
                            </div>
                        )}

                        {/* ── Tab: IMAGES ────────────────────────────────────── */}
                        {activeTab === 'images' && (
                            <div className="image-manager">
                                <div className="upload-zone">
                                    <label className="upload-btn-label">
                                        <IoCloudUploadOutline size={24} />
                                        <span>Tải ảnh lên (Minh chứng)</span>
                                        <input type="file" multiple onChange={handleFileSelect}
                                            style={{ display: 'none' }} disabled={isAnalyzing} />
                                    </label>
                                    <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                        * Chọn ảnh chụp tại quán (có bật GPS) để tự động điền vị trí và địa chỉ.
                                        {isAnalyzing && <strong style={{ color: '#764ba2', marginLeft: 6 }}>⏳ Đang phân tích AI...</strong>}
                                    </p>
                                    <div className="new-images-list">
                                        {newImagesData.length === 0 && (
                                            <p style={{ fontSize: 13, color: '#999', fontStyle: 'italic', marginTop: 8 }}>Chưa có ảnh nào.</p>
                                        )}
                                        {newImagesData.map((item, index) => (
                                            <div key={index} className="new-img-row" style={{ alignItems: 'center' }}>
                                                <img src={item.previewUrl} alt={item.file.name}
                                                    onClick={() => setZoomedImage(item.previewUrl)}
                                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', border: '1px solid #ddd' }} />
                                                <span className="file-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.file.name}
                                                </span>
                                                <input className="img-describe-input" placeholder="Chú thích..."
                                                    value={item.describe}
                                                    onChange={(e) => handleImageDescribeChange(index, e.target.value)} />
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
                        <button className="btn-submit" onClick={handleSubmit}
                            disabled={isSubmitting || isAnalyzing}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IoPaperPlane />
                            {isSubmitting ? 'Đang gửi...' : isAnalyzing ? 'Đang phân tích...' : 'Gửi yêu cầu duyệt'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Dialog chọn / đổi biển hiệu */}
            {showSignDialog && pendingSigns && (
                <SignSelectionDialog
                    signs={pendingSigns.signs}
                    currentIndex={selectedSignIdx}
                    onConfirm={(idx) => handleConfirmSign(idx)}
                    onCancel={() => setShowSignDialog(false)}
                />
            )}

            {/* Lightbox zoom */}
            {zoomedImage && (
                <div onClick={() => setZoomedImage(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
                    }}>
                    <img src={zoomedImage} alt="Preview"
                        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
                        onClick={e => e.stopPropagation()} />
                    <button onClick={() => setZoomedImage(null)}
                        style={{
                            position: 'absolute', top: '20px', right: '20px',
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                            width: '40px', height: '40px', color: 'white', fontSize: '20px', cursor: 'pointer',
                        }}><IoClose /></button>
                </div>
            )}
        </>
    );
};

export default CreateStoreModal;