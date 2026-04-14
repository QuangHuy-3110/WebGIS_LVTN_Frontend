import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
// 1. Xóa IoDocumentText ở đây
import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';

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

    }
  };


  const renderChanges = (noteString) => {
    try {
      const data = JSON.parse(noteString);
      return (
        <ul className="changes-list">
          {data.name && <li><strong>Tên mới:</strong> {data.name}</li>}
          {data.address && <li><strong>Địa chỉ:</strong> {data.address}</li>}
          {data.describe && <li><strong>Mô tả:</strong> {data.describe}</li>}
          {data.new_images?.length > 0 && <li><strong>Ảnh mới:</strong> {data.new_images.length} ảnh</li>}
        </ul>
      );
    } catch (e) {
      return <p style={{ color: 'red' }}>Lỗi đọc dữ liệu JSON</p>;
    }
  };

  return (
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