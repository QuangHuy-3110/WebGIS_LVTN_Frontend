import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
// 1. Xóa IoDocumentText ở đây
import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';

const ImagePreviewList = ({ imageIds, authFetch }) => {
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchImages = async () => {
            const fetched = [];
            for (let id of imageIds) {
                try {
                    const res = await authFetch(`http://127.0.0.1:8000/api/store-images/${id}/`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.image) fetched.push(data.image);
                    }
                } catch (e) {
                    console.error("Error fetching image", id, e);
                }
            }
            setImages(fetched);
        };
        fetchImages();
    }, [imageIds, authFetch]);

    if (images.length === 0) return <p style={{fontSize:'12px', color:'#666'}}>Đang tải ảnh hoặc không tìm thấy...</p>;

    return (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
            {images.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Ảnh mới ${i+1}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd', cursor: 'zoom-in' }} />
                </a>
            ))}
        </div>
    );
};

const AdminDashboard = ({ onClose }) => {
  const { authFetch } = useAuth();
  const [approvals, setApprovals] = useState([]);
  // 2. Xóa dòng khai báo selectedRequest này đi
  // const [selectedRequest, setSelectedRequest] = useState(null); 

  const loadApprovals = useCallback(async () => {
    const res = await authFetch('http://127.0.0.1:8000/api/approvals/?status=pending');
    if (res && res.ok) {
        const data = await res.json();
        setApprovals(data.results || data);
    }
  }, [authFetch]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleApprove = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn duyệt và áp dụng thay đổi này?")) return;
    
    const res = await authFetch(`http://127.0.0.1:8000/api/approvals/${id}/approve/`, {
        method: 'POST'
    });
    if (res.ok) {
        alert("Đã duyệt thành công!");
        loadApprovals();
        // 3. Xóa dòng setSelectedRequest(null); nếu có
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Từ chối hồ sơ này?")) return;

    const res = await authFetch(`http://127.0.0.1:8000/api/approvals/${id}/reject/`, {
        method: 'POST'
    });
    if (res.ok) {
        alert("Đã từ chối!");
        loadApprovals();
        // 4. Xóa dòng setSelectedRequest(null); nếu có
    }
  };

  // ... (Phần renderChanges và return giữ nguyên)
  const renderChanges = (noteString) => {
     try {
        const data = JSON.parse(noteString);
        const inputStyle = { width: '100%', padding: '6px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9', color: '#333' };
        const labelStyle = { fontWeight: 'bold', fontSize: '13px', color: '#555', marginTop: '8px', display: 'block' };

        return (
            <div className="changes-form" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #eee' }}>
                {data.name !== undefined && (
                    <div>
                        <label style={labelStyle}>Tên yêu cầu mới:</label>
                        <input type="text" readOnly value={data.name} style={inputStyle} />
                    </div>
                )}
                {data.address !== undefined && (
                    <div>
                        <label style={labelStyle}>Địa chỉ mới:</label>
                        <input type="text" readOnly value={data.address} style={inputStyle} />
                    </div>
                )}
                {data.phone !== undefined && (
                    <div>
                        <label style={labelStyle}>Số điện thoại:</label>
                        <input type="text" readOnly value={data.phone} style={inputStyle} />
                    </div>
                )}
                {data.email !== undefined && (
                    <div>
                        <label style={labelStyle}>Email:</label>
                        <input type="text" readOnly value={data.email} style={inputStyle} />
                    </div>
                )}
                {data.describe !== undefined && (
                    <div>
                        <label style={labelStyle}>Mô tả mới:</label>
                        <textarea readOnly value={data.describe} rows={3} style={{...inputStyle, resize: 'vertical'}} />
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    {data.open_time !== undefined && (
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Giờ mở cửa:</label>
                            <input type="text" readOnly value={data.open_time} style={inputStyle} />
                        </div>
                    )}
                    {data.close_time !== undefined && (
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Giờ đóng cửa:</label>
                            <input type="text" readOnly value={data.close_time} style={inputStyle} />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {data.latitude !== undefined && (
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Vĩ độ (Lat):</label>
                            <input type="text" readOnly value={data.latitude} style={inputStyle} />
                        </div>
                    )}
                    {data.longitude !== undefined && (
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Kinh độ (Lng):</label>
                            <input type="text" readOnly value={data.longitude} style={inputStyle} />
                        </div>
                    )}
                </div>

                {data.new_images?.length > 0 && (
                    <div>
                        <label style={labelStyle}>Ảnh mới kèm theo ({data.new_images.length} ảnh):</label>
                        <ImagePreviewList imageIds={data.new_images} authFetch={authFetch} />
                    </div>
                )}
                {data.deleted_images?.length > 0 && (
                    <div>
                        <label style={labelStyle}>Ảnh bị yêu cầu xóa ({data.deleted_images.length} ảnh):</label>
                        <div style={{ opacity: 0.6 }}>
                            <ImagePreviewList imageIds={data.deleted_images} authFetch={authFetch} />
                        </div>
                    </div>
                )}
            </div>
        );
    } catch (e) {
        return <p style={{color: 'red'}}>Lỗi đọc dữ liệu: {noteString}</p>;
    }
  };

  return (
    // ... code cũ giữ nguyên
    <div className="panel-container admin-panel">
      <div className="panel-header">
        <h3>🛡️ Duyệt hồ sơ chỉnh sửa</h3>
        <button onClick={onClose}>Đóng</button>
      </div>

      <div className="request-list">
        {approvals.length === 0 ? (
          <p className="empty-msg">Không có hồ sơ nào cần duyệt.</p>
        ) : (
          approvals.map(req => (
            <div key={req.id} className="request-item">
              <div className="req-info">
                <strong>{req.store_name}</strong>
                <p>Người gửi: {req.submitter_name || 'Ẩn danh'}</p>
                <div className="note-preview">
                    {renderChanges(req.note)}
                </div>
              </div>
              <div className="req-actions">
                <button className="btn-approve" onClick={() => handleApprove(req.id)}>
                  <IoCheckmarkCircle size={20} /> Duyệt
                </button>
                <button className="btn-reject" onClick={() => handleReject(req.id)}>
                  <IoCloseCircle size={20} /> Hủy
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;