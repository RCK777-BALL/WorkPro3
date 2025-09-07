import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Loader from './components/Loader';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AssetsPage = lazy(() => import('./pages/AssetsPage'));
const AssetDetails = lazy(() => import('./pages/AssetDetails'));
const AssetScan = lazy(() => import('./pages/AssetScan'));
const Documentation = lazy(() => import('./pages/Documentation'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const PMTasksPage = lazy(() => import('./pages/PMTasksPage'));
const Messages = lazy(() => import('./pages/Messages'));
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const Settings = lazy(() => import('./pages/Settings'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamMemberProfile = lazy(() => import('./pages/TeamMemberProfile'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
 // Departments
const Departments = lazy(() => import('./pages/Departments'));
 
const NewDepartmentPage = lazy(() => import('./pages/NewDepartmentPage'));
const Notifications = lazy(() => import('./pages/Notifications'));

const AdminTenants = lazy(() => import('./pages/AdminTenants'));
const Portal = lazy(() => import('./portal'));
const VendorLogin = lazy(() => import('./vendor/Login'));
const VendorPOList = lazy(() => import('./vendor/POList'));
const VendorPODetail = lazy(() => import('./vendor/PODetail'));
const NotFound = lazy(() => import('./pages/NotFound'));
 

function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/portal/:slug" element={<Portal />} />
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/pos" element={<VendorPOList />} />
        <Route path="/vendor/pos/:id" element={<VendorPODetail />} />
 
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:id" element={<AssetDetails />} />
          <Route path="/scan" element={<AssetScan />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/pm-tasks" element={<PMTasksPage />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/vendors" element={<VendorsPage />} />
          {/* Departments routes */}
          <Route path="/departments" element={<Departments />} />
          <Route path="/departments/new" element={<NewDepartmentPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamMemberProfile />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/tenants" element={<AdminTenants />} />
        </Route>
 
 {/* catch-all -> 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
