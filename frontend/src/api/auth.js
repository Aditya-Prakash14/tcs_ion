import axios from 'axios';

// Base configuration for axios
const API_URL = process.env.REACT_APP_API_URL || '';

// Set default base URL
axios.defaults.baseURL = API_URL;

// Authentication API functions

// Login user
export const loginUser = async (credentials) => {
  const response = await axios.post('/api/auth/login', credentials);
  return response.data;
};

// Register user
export const registerUser = async (userData) => {
  const response = await axios.post('/api/auth/register', userData);
  return response.data;
};

// Get current user
export const getUser = async () => {
  const response = await axios.get('/api/auth/me');
  return response.data;
};

// Logout user
export const logoutUser = async () => {
  const response = await axios.post('/api/auth/logout');
  return response.data;
};

// Update user profile
export const updateUser = async (userData) => {
  const response = await axios.put('/api/auth/me', userData);
  return response.data;
};

// Request password reset
export const requestPasswordReset = async (email) => {
  const response = await axios.post('/api/auth/forgot-password', { email });
  return response.data;
};

// Reset password
export const resetPassword = async (token, newPassword) => {
  const response = await axios.post(`/api/auth/reset-password/${token}`, {
    password: newPassword
  });
  return response.data;
};

// Change password
export const changePassword = async ({ oldPassword, newPassword }) => {
  const response = await axios.post('/api/auth/change-password', {
    oldPassword,
    newPassword
  });
  return response.data;
};
