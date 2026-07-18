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
import { Settings } from './pages/Settings';
import { AuditLogs } from './pages/AuditLogs';
import { EmbassyActivity } from './pages/EmbassyActivity';
import { Chat } from './pages/Chat';
import { Receptionist } from './pages/Receptionist';
import { Login } from './pages/Login';
import { TemplateList, TemplateBuilder } from './features/visa-templates';

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
            <Route path="receptionist" element={<Receptionist />} />
            <Route path="visa-templates" element={<TemplateList />} />
            <Route path="visa-templates/new" element={<TemplateBuilder />} />
            <Route path="visa-templates/default" element={<TemplateBuilder />} />
            <Route path="visa-templates/:id" element={<TemplateBuilder />} />
            <Route path="staff" element={<Staff />} />
            <Route path="chat" element={<Chat />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="embassy-activity" element={<EmbassyActivity />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
