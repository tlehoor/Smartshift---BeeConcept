import React from 'react';
import { useApp } from '../context/AppContext';
import { ManagerDashboard } from '../components/dashboard/ManagerDashboard';
import { StaffDashboard } from '../components/dashboard/StaffDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useApp();

  if (currentUser.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (currentUser.role === 'MANAGER') {
    return <ManagerDashboard />;
  }

  // OFFICIAL_STAFF, PROBATION_STAFF, WORKSHOP
  return <StaffDashboard />;
};

export default DashboardPage;
