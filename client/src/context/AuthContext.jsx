import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use useMemo to ensure the api instance is stable across re-renders
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: 'http://localhost:3001/api',
    });

    // Use an interceptor to dynamically add the token.
    // This is more robust than setting default headers manually.
    instance.interceptors.request.use(config => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return instance;
  }, []);

  // Effect to run on initial app load to check for an existing session
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          // Token is invalid or expired
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [api]); // Depend on the stable api instance

  const login = async (username, password) => {
    // We wrap the logic in a promise to ensure callers can `await` the FULL process
    return new Promise(async (resolve, reject) => {
      try {
        const response = await api.post('/auth/login', { username, password });
        const { token, id, username: resUsername } = response.data;
        
        // 1. Store the token
        localStorage.setItem('token', token);
        
        // 2. Set the user state
        setUser({ id, username: resUsername });
        
        // 3. Resolve the promise
        resolve(response);
      } catch (error) {
        // 4. If anything fails, reject the promise
        reject(error);
      }
    });
  };

  const signup = async (username, password) => {
     return new Promise(async (resolve, reject) => {
      try {
        const response = await api.post('/auth/signup', { username, password });
        const { token, id, username: resUsername } = response.data;
        
        localStorage.setItem('token', token);
        setUser({ id, username: resUsername });
        
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = { user, login, logout, signup, loading, api };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
