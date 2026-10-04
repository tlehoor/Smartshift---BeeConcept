import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/scheduler/draft" element={<DraftReviewPage />} />
            <Route path="/scheduler/versions" element={<VersionComparisonPage />} />
            <Route path="/schedule/published" element={<PublishedSchedulePage />} />

            {/* Coordination */}
            <Route path="/cover" element={<CoverPage />} />
            <Route path="/cover/requests" element={<CoverRequestsPage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/swap/requests" element={<SwapRequestsPage />} />
            <Route path="/debt" element={<DebtPage />} />

            {/* Staff & System */}
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
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
