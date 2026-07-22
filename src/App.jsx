import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import UpdateBanner from './components/UpdateBanner';
import useHardwareBackButton from './hooks/useHardwareBackButton';

import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Feed from './pages/Feed';
import Search from './pages/Search';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Inbox from './pages/Inbox';
import Conversation from './pages/Conversation';
import Admin from './pages/Admin';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

function AppRoutes() {
  useHardwareBackButton();
  return (
    <div className="app-shell">
      <UpdateBanner />
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/feed" element={<ProtectedLayout><Feed /></ProtectedLayout>} />
        <Route path="/search" element={<ProtectedLayout><Search /></ProtectedLayout>} />
        <Route path="/create" element={<ProtectedLayout><CreatePost /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
        <Route path="/profile/:userId" element={<ProtectedLayout><PublicProfile /></ProtectedLayout>} />
        <Route path="/inbox" element={<ProtectedLayout><Inbox /></ProtectedLayout>} />
        <Route path="/inbox/messages/:conversationId" element={<ProtectedLayout><Conversation /></ProtectedLayout>} />
        <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
