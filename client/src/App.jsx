// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import { SocketProvider } from './context/SocketContext';
import DashboardPage from './pages/DashboardPage'; // We will create this next
import './App.css';

// Placeholder for DashboardPage until we create it
const PlaceholderDashboard = () => <div style={{ color: 'white', padding: '2rem' }}>Welcome to the Dashboard.</div>;


function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <div className="app-container">
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <PlaceholderDashboard /> 
                  <DashboardPage />
                  {/* <DashboardPage />  <-- This will be the real component */}
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
