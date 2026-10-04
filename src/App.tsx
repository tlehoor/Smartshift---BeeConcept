import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { hasPermission, Permission } from './types/permissions';
import { AccessDenied } from './components/common/AccessDenied';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { DraftReviewPage } from './pages/DraftReviewPage';
import { VersionComparisonPage } from './pages/VersionComparisonPage';
import { PublishedSchedulePage } from './pages/PublishedSchedulePage';
import { CoverPage } from './pages/CoverPage';
import { CoverRequestsPage } from './pages/CoverRequestsPage';
import { SwapPage } from './pages/SwapPage';
import { SwapRequestsPage } from './pages/SwapRequestsPage';
import { DebtPage } from './pages/DebtPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
  const { isAuthenticated, currentUser } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(currentUser.role, permission)) {
    return <AccessDenied requiredPermission={permission} />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected enterprise app shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Schedule & Scheduling */}
            <Route
              path="/schedule"
              element={
                <ProtectedRoute permission="schedule.view">
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/availability"
              element={
                <ProtectedRoute permission="availability.manage">
                  <AvailabilityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scheduler"
              element={
                <ProtectedRoute permission="scheduler.run">
                  <SchedulerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scheduler/draft"
              element={
                <ProtectedRoute permission="scheduler.run">
                  <DraftReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scheduler/versions"
              element={
                <ProtectedRoute permission="scheduler.run">
                  <VersionComparisonPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule/published"
              element={
                <ProtectedRoute permission="schedule.view">
                  <PublishedSchedulePage />
                </ProtectedRoute>
              }
            />

            {/* Coordination */}
            <Route
              path="/cover"
              element={
                <ProtectedRoute permission="cover.create">
                  <CoverPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cover/requests"
              element={
                <ProtectedRoute permission="cover.respond">
                  <CoverRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/swap"
              element={
                <ProtectedRoute permission="swap.create">
                  <SwapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/swap/requests"
              element={
                <ProtectedRoute permission="swap.respond">
                  <SwapRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debt"
              element={
                <ProtectedRoute permission="debt.view">
                  <DebtPage />
                </ProtectedRoute>
              }
            />

            {/* Admin only modules */}
            <Route
              path="/employees"
              element={
                <ProtectedRoute permission="employees.manage">
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute permission="approvals.manage">
                  <ApprovalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute permission="audit.view">
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />

            {/* Account settings (all authenticated users) */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
