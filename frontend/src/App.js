import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ExamLayout from './layouts/ExamLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AssessmentList from './pages/assessments/AssessmentList';
import AssessmentDetail from './pages/assessments/AssessmentDetail';
import TakeAssessment from './pages/assessments/TakeAssessment';
import Results from './pages/assessments/Results';
import QuestionBank from './pages/admin/QuestionBank';
import CreateAssessment from './pages/admin/CreateAssessment';
import Organizations from './pages/admin/Organizations';
import Profile from './pages/user/Profile';
import NotFound from './pages/NotFound';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// API
import { getUser } from './api/auth';

// Components
import LoadingScreen from './components/common/LoadingScreen';
import PrivateRoute from './components/auth/PrivateRoute';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Check authentication status on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        // Validate token
        await getUser();
        setIsLoading(false);
      } catch (error) {
        // Clear invalid token
        localStorage.removeItem('token');
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          
          {/* Exam Routes */}
          <Route element={<PrivateRoute><ExamLayout /></PrivateRoute>}>
            <Route path="/take-assessment/:id" element={<TakeAssessment />} />
          </Route>
          
          {/* Main App Routes */}
          <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assessments" element={<AssessmentList />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/question-bank" element={<QuestionBank />} />
            <Route path="/create-assessment" element={<CreateAssessment />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          
          {/* Redirect to dashboard if authenticated and trying to access login */}
          <Route 
            path="/" 
            element={
              localStorage.getItem('token') 
              ? <Navigate to="/dashboard" replace /> 
              : <Navigate to="/login" replace />
            }
          />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
