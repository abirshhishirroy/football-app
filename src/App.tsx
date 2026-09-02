import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { TeamBuilder } from './pages/TeamBuilder';
import { Teams } from './pages/Teams';
import { Notice } from './pages/Notice';
import { Matches } from './pages/Matches';
import { Memories } from './pages/Memories';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { ProfileSetup } from './pages/ProfileSetup';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/players" element={<ProtectedRoute><Layout><Players /></Layout></ProtectedRoute>} />
          <Route path="/team-builder" element={<ProtectedRoute><Layout><TeamBuilder /></Layout></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><Layout><Teams /></Layout></ProtectedRoute>} />
          <Route path="/notice" element={<ProtectedRoute><Layout><Notice /></Layout></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><Layout><Matches /></Layout></ProtectedRoute>} />
          <Route path="/memories" element={<ProtectedRoute><Layout><Memories /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
