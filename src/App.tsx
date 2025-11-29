import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { EnhancedLogin } from './pages/EnhancedLogin';
import { ProfileSetup } from './pages/ProfileSetup';
import { PendingApproval } from './pages/PendingApproval';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { Calls } from './pages/Calls';
import { Engineers } from './pages/Engineers';
import { Approvals } from './pages/Approvals';
import MobileCalls from './pages/mobile/MobileCalls';
import MobileCallDetail from './pages/mobile/MobileCallDetail';
import MobileScanDevice from './pages/mobile/MobileScanDevice';
import MobileCompleteCall from './pages/mobile/MobileCompleteCall';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<EnhancedLogin />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/pending-approval" element={<PendingApproval />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <Layout>
                  <Devices />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calls"
            element={
              <ProtectedRoute>
                <Layout>
                  <Calls />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/engineers"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Engineers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <Approvals />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/mobile/calls"
            element={
              <ProtectedRoute>
                <MobileCalls />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/calls/:id"
            element={
              <ProtectedRoute>
                <MobileCallDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/calls/:id/scan"
            element={
              <ProtectedRoute>
                <MobileScanDevice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/calls/:id/complete"
            element={
              <ProtectedRoute>
                <MobileCompleteCall />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
