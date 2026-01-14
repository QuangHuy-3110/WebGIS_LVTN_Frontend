import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(true);

  // 1. Load user từ localStorage khi F5
  useEffect(() => {
    const savedUser = localStorage.getItem('userInfo');
    const savedToken = localStorage.getItem('accessToken');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // 2. Hàm Login: Sửa để lưu thêm Refresh Token
  const login = async (username, password) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        // Lưu Access Token
        localStorage.setItem('accessToken', data.access);
        setToken(data.access);

        // --- QUAN TRỌNG: Lưu Refresh Token ---
        localStorage.setItem('refreshToken', data.refresh); 

        // Lưu thông tin User
        const userConfig = { 
          username: data.username, 
          full_name: data.full_name,
          role: data.is_staff ? 'admin' : 'user',
          avatar: data.avatar
        };
        
        localStorage.setItem('userInfo', JSON.stringify(userConfig));
        setCurrentUser(userConfig);
        return { success: true, isStaff: data.is_staff };
      }
      return { success: false, message: "Sai tài khoản hoặc mật khẩu" };
    } catch (err) {
      return { success: false, message: "Lỗi kết nối Server" };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); // Xóa cả refresh token
    localStorage.removeItem('userInfo');
    setToken(null);
    setCurrentUser(null);
    // Có thể reload trang để reset sạch sẽ state
    // window.location.reload(); 
  }, []);

  // 3. Hàm gọi API thông minh (Tự động Refresh Token khi hết hạn)
  const authFetch = useCallback(async (url, options = {}) => {
    let currentToken = localStorage.getItem('accessToken');

    // Tạo headers cơ bản
    const headers = {
        'Authorization': `Bearer ${currentToken}`,
        ...options.headers
    };

    // --- SỬA LOGIC QUAN TRỌNG TẠI ĐÂY ---
    if (options.body instanceof FormData) {
        // Nếu là FormData (Upload ảnh):
        // BẮT BUỘC PHẢI XÓA Content-Type để trình duyệt tự điền boundary
        if (headers['Content-Type']) {
            delete headers['Content-Type'];
        }
    } else {
        // Nếu là dữ liệu thường (JSON):
        // Nếu chưa có Content-Type thì set mặc định là JSON
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
    }
    // -------------------------------------

    let response = await fetch(url, {
        ...options,
        headers: headers
    });

    // Xử lý khi Token hết hạn (Refresh Token) - Logic này giữ nguyên
    if (response.status === 401) {
      console.log("Token hết hạn! Đang thử Refresh...");
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logout();
        return response;
      }

      const refreshRes = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Riêng API này luôn là JSON
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.access;
        
        localStorage.setItem('accessToken', newAccessToken);
        setToken(newAccessToken);

        // Gọi lại request ban đầu với Token mới
        // Cần cập nhật lại Authorization header mới
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        logout();
      }
    }

    return response;
  }, [logout]);

  return (
    // Thêm 'token' vào danh sách value gửi đi
    <AuthContext.Provider value={{ currentUser, token, login, logout, authFetch, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);