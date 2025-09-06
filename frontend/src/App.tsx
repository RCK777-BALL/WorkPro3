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
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
 
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
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<ProtectedRoute><AssetDetails /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><AssetScan /></ProtectedRoute>} />
        <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/pm-tasks" element={<ProtectedRoute><PMTasksPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute><VendorsPage /></ProtectedRoute>} />
         {/* Departments routes */}
        <Route path="/departments" element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
 
        <Route path="/departments/new" element={<ProtectedRoute><NewDepartmentPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
        <Route path="/teams/:id" element={<ProtectedRoute><TeamMemberProfile /></ProtectedRoute>} />
        <Route path="/work-orders" element={<ProtectedRoute><WorkOrders /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
 
        <Route
          path="/tenants"
          element={
            <ProtectedRoute role="admin">
              <AdminTenants />
            </ProtectedRoute>
          }
        />
 {/* catch-all -> 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
