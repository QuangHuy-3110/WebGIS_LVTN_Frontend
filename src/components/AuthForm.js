// src/components/AuthForm.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IoClose } from 'react-icons/io5';

const AuthForm = ({ onClose }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Thêm trạng thái loading
  
  const { login } = useAuth();

  const handleSubmit = async (e) => { // <--- Thêm async
    e.preventDefault();
    setError('');
    
    if (isLoginMode) {
      setIsLoading(true); // Bật loading
      
      // Gọi hàm login từ Context (đã sửa ở Bước 2)
      const result = await login(username, password);
      
      setIsLoading(false); // Tắt loading

      if (result.success) {
        // --- LOGIC PHÂN QUYỀN Ở ĐÂY ---
        if (result.isStaff) {
            // Nếu là Admin -> Chuyển hướng sang trang Admin Django
            window.location.href = "http://127.0.0.1:8000/admin/";
        } else {
            // Nếu là User thường -> Đóng form, React tự cập nhật giao diện nhờ AuthContext
            onClose();
        }
      } else {
        setError(result.message || 'Sai tài khoản hoặc mật khẩu!');
      }

    } else {
      // Logic Đăng ký (Giữ nguyên hoặc gọi API đăng ký thật)
      alert('Chức năng đăng ký đang phát triển. Hãy thử đăng nhập Admin!');
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-box">
        <button className="close-btn" onClick={onClose}><IoClose size={24}/></button>
        <h2>{isLoginMode ? 'Đăng Nhập' : 'Đăng Ký'}</h2>
        
        <form onSubmit={handleSubmit}>
          {/* ... Các input giữ nguyên ... */}
          <div className="input-group">
            <label>Tên đăng nhập</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          
          {error && <p className="error-msg" style={{color: 'red'}}>{error}</p>}
          
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : (isLoginMode ? 'Đăng nhập ngay' : 'Đăng ký tài khoản')}
          </button>
        </form>
        
        {/* ... Phần switch mode giữ nguyên ... */}
        <p className="switch-mode">
          {isLoginMode ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
          <span onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}>
            {isLoginMode ? ' Đăng ký' : ' Đăng nhập'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;