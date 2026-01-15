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
    // Sau khi kiểm tra xong thì tắt loading
    setLoading(false);
  }, []);

  // Hàm tiện ích: Xử lý đường dẫn Avatar
  const getAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('https')) {
        return url;
    }
    return `http://127.0.0.1:8000${url}`;
  };

  const register = async (userData) => {
    try {
      const isFormData = userData instanceof FormData;
      
      const options = {
        method: 'POST',
        headers: {}, 
      };

      if (isFormData) {
         options.body = userData;
      } else {
         options.headers['Content-Type'] = 'application/json';
         options.body = JSON.stringify(userData);
      }

      const response = await fetch('http://127.0.0.1:8000/api/users/', options);
      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        let errorMsg = "Đăng ký thất bại.";
        if (typeof data === 'object') {
            const firstKey = Object.keys(data)[0];
            if(firstKey) errorMsg = `${firstKey}: ${data[firstKey][0]}`; 
        }
        return { success: false, message: errorMsg };
      }
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, message: "Lỗi kết nối server!" };
    }
  };

  const login = async (username, password) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh); 
        setToken(data.access);

        const userConfig = { 
          username: data.username, 
          full_name: data.full_name,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
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

  const updateLoginState = (newData) => {
      const updatedUser = { ...currentUser, ...newData };
      setCurrentUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
  };

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    setToken(null);
    setCurrentUser(null);
  }, []);

  const authFetch = useCallback(async (url, options = {}) => {
    let currentToken = localStorage.getItem('accessToken');
    const headers = {
        'Authorization': `Bearer ${currentToken}`,
        ...options.headers
    };

    if (options.body instanceof FormData) {
        if (headers['Content-Type']) delete headers['Content-Type'];
    } else {
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logout();
        return response;
      }

      const refreshRes = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem('accessToken', refreshData.access);
        setToken(refreshData.access);
        headers['Authorization'] = `Bearer ${refreshData.access}`;
        response = await fetch(url, { ...options, headers });
      } else {
        logout();
      }
    }
    return response;
  }, [logout]);

  return (
    <AuthContext.Provider value={{ 
        currentUser, 
        token,   // <--- KHẮC PHỤC WARNING 1: Truyền token ra ngoài
        loading, // <--- KHẮC PHỤC WARNING 2: Truyền loading ra ngoài
        login, 
        logout, 
        authFetch, 
        register,        
        getAvatarUrl,    
        updateLoginState 
    }}>
      {/* KHẮC PHỤC WARNING 2 (Quan trọng): 
        Chỉ render ứng dụng khi loading = false (đã load xong user từ localStorage).
        Việc này giúp tránh lỗi giao diện bị nhảy khi F5.
      */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);