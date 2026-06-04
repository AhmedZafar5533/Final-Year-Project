import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import './App.css'

function App() {
  const { user, loading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="loader-container">
        <div className="shimmer-loader"></div>
      </div>
    )
  }

  return (
    <Router>
      <div className="app-root">
        <nav className="navbar">
          <div className="nav-logo" onClick={() => window.location.href = '/'}>
            <div className="logo-hex"></div>
            <span>Antigravity</span>
          </div>
          <div className="nav-links">
            <a href="/dashboard" className="nav-link">Dashboard</a>
            <a href="#" className="nav-link">Features</a>
            {user ? (
               <div className="user-nav" style={{cursor: 'pointer'}} onClick={() => window.location.href = '/profile'}>
                 <span>{user.fullName || user.email}</span>
               </div>
            ) : (
              <button className="nav-btn" onClick={() => window.location.href = '/login'}>Get Started</button>
            )}
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
            <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2026 Antigravity. Modern Authentication System.</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
