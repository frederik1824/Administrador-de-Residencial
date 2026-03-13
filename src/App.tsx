import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './screens/Login';
import { Residents } from './screens/Residents';
import { ResidentDetails } from './screens/ResidentDetails';
import { Dashboard } from './screens/Dashboard';
import { Payments } from './screens/Payments';
import { BillingGeneration } from './screens/BillingGeneration';
import { BillingHistory } from './screens/BillingHistory';
import { Expenses } from './screens/Expenses';
import { Reports } from './screens/Reports';
import { Amenities } from './screens/Amenities';
import { Announcements } from './screens/Announcements';
import { Maintenance } from './screens/Maintenance';
import { Messages } from './screens/Messages';
import { ResidentialSettings } from './screens/ResidentialSettings';
import { BuildingsManagement } from './screens/BuildingsManagement';
import { ApartmentsManagement } from './screens/ApartmentsManagement';
import { HierarchyView } from './screens/HierarchyView';
import { UsersManagement } from './screens/UsersManagement';
import { RolesManagement } from './screens/RolesManagement';
import { Notifications } from './screens/Notifications';
import { useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';

// Protected Route Component
const ProtectedRoute = ({ allowedRoles, permission }: { allowedRoles?: string[], permission?: string }) => {
  const { isAuthenticated, user, loading, hasPermission } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-lg shadow-primary/20"></div>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Advanced permission check
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  // Legacy role check support
  if (allowedRoles && user) {
    const roleId = user.roleId || 'superadmin';
    if (!allowedRoles.includes(roleId) && roleId !== 'superadmin') {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <UIProvider>
        <Routes>
          {/* Public Login */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />

              {/* General Routes */}
              <Route path="residents" element={<Residents />} />
              <Route path="residents/:id" element={<ResidentDetails />} />
              <Route path="amenities" element={<Amenities />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="maintenance" element={<Maintenance />} />
               <Route path="messages" element={<Messages />} />
              <Route path="hierarchy" element={<HierarchyView />} />
              <Route path="notifications" element={<Notifications />} />

              {/* Financial Routes */}
              <Route element={<ProtectedRoute allowedRoles={['contabilidad', 'superadmin']} />}>
                <Route path="payments" element={<Payments />} />
                <Route path="billing-generation" element={<BillingGeneration />} />
                <Route path="billing-history" element={<BillingHistory />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="reports" element={<Reports />} />
              </Route>

              {/* Config & Structure Routes */}
              <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="settings" element={<ResidentialSettings />} />
                <Route path="buildings" element={<BuildingsManagement />} />
                <Route path="apartments" element={<ApartmentsManagement />} />
              </Route>

              {/* Access Management (Powered by Granular Permissions) */}
              <Route element={<ProtectedRoute permission="users_view" />}>
                <Route path="users" element={<UsersManagement />} />
              </Route>
              <Route element={<ProtectedRoute permission="roles_manage" />}>
                <Route path="roles" element={<RolesManagement />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UIProvider>
    </Router>
  );
}

export default App;
