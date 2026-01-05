import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ExamIntro from './pages/ExamIntro';
import ExamRoom from './pages/ExamRoom';
import ResultPage from './pages/ResultPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateTest from './pages/admin/CreateTest';
import RecruiterDashboard from './pages/admin/RecruiterDashboard';
import AdminDetailedResult from './pages/admin/AdminDetailedResult';
import TestManagement from './pages/admin/TestManagement';
import OrganizationManagement from './pages/admin/OrganizationManagement';
import AdminRoute from './components/AdminRoute';
import AdminLogin from './pages/admin/AdminLogin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exam/:testId/intro" element={<ExamIntro />} />
        <Route path="/exam/:testId/start" element={<ExamRoom />} />
        <Route path="/results/:resultId" element={<ResultPage />} />

        {/* Admin Login (Public) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Routes (Protected) */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="results" element={<RecruiterDashboard />} />
            <Route path="results/:resultId" element={<AdminDetailedResult />} />
            <Route path="tests" element={<TestManagement />} />
            <Route path="organizations" element={<OrganizationManagement />} />
            <Route path="create-test" element={<CreateTest />} />
            {/* Default redirect */}
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Redirect Root to Login for now */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
