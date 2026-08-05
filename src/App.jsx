import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import RightRail from './components/RightRail';
import UpdateBanner from './components/UpdateBanner';
import InstallPrompt from './components/InstallPrompt';
import useHardwareBackButton from './hooks/useHardwareBackButton';

import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Feed from './pages/Feed';
import Search from './pages/Search';
import HashtagFeed from './pages/HashtagFeed';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Inbox from './pages/Inbox';
import Notifications from './pages/Notifications';
import PostView from './pages/PostView';
import Friends from './pages/Friends';
import Conversation from './pages/Conversation';
import Admin from './pages/Admin';
import Groups from './pages/Groups';
import CreateGroup from './pages/CreateGroup';
import GroupDetail from './pages/GroupDetail';
import GroupSettings from './pages/GroupSettings';
import Events from './pages/Events';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Insights from './pages/Insights';
import Quests from './pages/Quests';

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
    <div className="protected-body">
      <BottomNav />
      <div className="protected-main">
        {children}
      </div>
      <RightRail />
    </div>
  );
}

function AppRoutes() {
  useHardwareBackButton();
  return (
    <div className="app-shell">
      <UpdateBanner />
      <InstallPrompt />
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/feed" element={<ProtectedLayout><Feed /></ProtectedLayout>} />
        <Route path="/search" element={<ProtectedLayout><Search /></ProtectedLayout>} />
        <Route path="/hashtag/:tag" element={<ProtectedLayout><HashtagFeed /></ProtectedLayout>} />
        <Route path="/create" element={<ProtectedLayout><CreatePost /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
        <Route path="/profile/:userId" element={<ProtectedLayout><PublicProfile /></ProtectedLayout>} />
        <Route path="/inbox" element={<ProtectedLayout><Inbox /></ProtectedLayout>} />
        <Route path="/notifications" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />
        <Route path="/post/:postId" element={<ProtectedLayout><PostView /></ProtectedLayout>} />
        <Route path="/friends" element={<ProtectedLayout><Friends /></ProtectedLayout>} />
        <Route path="/inbox/messages/:conversationId" element={<ProtectedLayout><Conversation /></ProtectedLayout>} />
        <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
        <Route path="/groups" element={<ProtectedLayout><Groups /></ProtectedLayout>} />
        <Route path="/groups/create" element={<ProtectedLayout><CreateGroup /></ProtectedLayout>} />
        <Route path="/groups/:groupId/settings" element={<ProtectedLayout><GroupSettings /></ProtectedLayout>} />
        <Route path="/groups/:groupId" element={<ProtectedLayout><GroupDetail /></ProtectedLayout>} />
        <Route path="/events" element={<ProtectedLayout><Events /></ProtectedLayout>} />
        <Route path="/events/create" element={<ProtectedLayout><CreateEvent /></ProtectedLayout>} />
        <Route path="/events/:eventId" element={<ProtectedLayout><EventDetail /></ProtectedLayout>} />
        <Route path="/insights" element={<ProtectedLayout><Insights /></ProtectedLayout>} />
        <Route path="/quests" element={<ProtectedLayout><Quests /></ProtectedLayout>} />

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
