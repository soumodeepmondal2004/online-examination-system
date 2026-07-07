import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout, { ThemeProvider } from './components/Layout';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Exams from './pages/Exams';
import ExamPortal from './pages/ExamPortal';
import AIStudyAssistant from './pages/AIStudyAssistant';
import Attendance from './pages/Attendance';
import PerformancePrediction from './pages/PerformancePrediction';
import ProctoringLogs from './pages/ProctoringLogs';

// Route Guard to protect sensitive dashboard routes
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <Layout>{children}</Layout>;
};

// Home Redirect Component
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${user.role}`} replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Secure Portal Dashboards */}
          <Route 
            path="/student" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Module-Specific Protected Routes */}
          <Route 
            path="/exams" 
            element={
              <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
                <Exams />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/study-assistant" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AIStudyAssistant />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
                <Attendance />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/prediction" 
            element={
              <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
                <PerformancePrediction />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/proctoring-logs" 
            element={
              <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                <ProctoringLogs />
              </ProtectedRoute>
            } 
          />

          {/* Active Exam Portal (No Layout Wrapper to prevent sidebar distraction) */}
          <Route 
            path="/exam/:id" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ExamPortal />
              </ProtectedRoute>
            } 
          />

          {/* Root Redirects */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
