import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './api/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { AdminShell } from './layout/AdminShell';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { ApplicationDetail } from './pages/ApplicationDetail';
import { Embassies } from './pages/Embassies';
import { EmbassyDetail } from './pages/EmbassyDetail';
import { EmbassyForm } from './pages/EmbassyForm';
import { Records } from './pages/Records';
import { Staff } from './pages/Staff';
import { Login } from './pages/Login';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <AdminShell />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="applications" element={<Applications />} />
            <Route path="applications/:id" element={<ApplicationDetail />} />
            <Route path="embassies" element={<Embassies />} />
            <Route path="embassies/new" element={<EmbassyForm mode="create" />} />
            <Route path="embassies/:id" element={<EmbassyDetail />} />
            <Route path="embassies/:id/edit" element={<EmbassyForm mode="edit" />} />
            <Route path="records" element={<Records />} />
            <Route path="staff" element={<Staff />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}