import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { FaqsPage } from './pages/FaqsPage';
import { GymsPage } from './pages/GymsPage';
import { ClassTypesPage } from './pages/ClassTypesPage';
import { CompliancePage } from './pages/CompliancePage';
import { TemplatesPage } from './pages/TemplatesPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/faqs"
          element={
            <ProtectedRoute>
              <AppShell>
                <FaqsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/class-types"
          element={
            <ProtectedRoute>
              <AppShell>
                <ClassTypesPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance"
          element={
            <ProtectedRoute>
              <AppShell>
                <CompliancePage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <AppShell>
                <TemplatesPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/gyms"
          element={
            <ProtectedRoute>
              <AppShell>
                <GymsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/faqs" replace />} />
        <Route path="*" element={<Navigate to="/faqs" replace />} />
      </Routes>
    </AuthProvider>
  );
}
