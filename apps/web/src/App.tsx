
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { UploadPage } from './pages/dashboard/UploadPage';
import { HistoryPage } from './pages/dashboard/HistoryPage';
import { SessionPage } from './pages/dashboard/SessionPage';
import { LibraryPage } from './pages/dashboard/LibraryPage';
import { TemplatesPage } from './pages/dashboard/TemplatesPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/auth.store';

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        
        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/dashboard/upload" element={<UploadPage />} />
            <Route path="/dashboard/history" element={<HistoryPage />} />
            <Route path="/dashboard/session/:id" element={<SessionPage />} />
            <Route path="/dashboard/library" element={<LibraryPage />} />
            <Route path="/dashboard/templates" element={<TemplatesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App



