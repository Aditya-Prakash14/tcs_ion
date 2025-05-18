import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';

// Icons
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [passwordMode, setPasswordMode] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  
  // Update profile mutation
  const updateProfileMutation = useMutation(
    (userData) => updateUser(userData),
    {
      onSuccess: () => {
        setUpdateSuccess(true);
        setTimeout(() => {
          setUpdateSuccess(false);
        }, 3000);
      },
      onError: (error) => {
        setUpdateError(error.response?.data?.message || 'Failed to update profile');
        setTimeout(() => {
          setUpdateError(null);
        }, 3000);
      }
    }
  );
  
  // Update password mutation
  const updatePasswordMutation = useMutation(
    (passwordData) => axios.put('/api/auth/password', passwordData),
    {
      onSuccess: () => {
        setUpdateSuccess(true);
        passwordFormik.resetForm();
        setTimeout(() => {
          setUpdateSuccess(false);
        }, 3000);
      },
      onError: (error) => {
        setUpdateError(error.response?.data?.message || 'Failed to update password');
        setTimeout(() => {
          setUpdateError(null);
        }, 3000);
      }
    }
  );
  
  // Profile form validation schema
  const profileValidationSchema = Yup.object({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
  });
  
  // Password form validation schema
  const passwordValidationSchema = Yup.object({
    currentPassword: Yup.string().required('Current password is required'),
    newPassword: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('New password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
      .required('Confirm password is required')
  });
  
  // Profile form setup
  const profileFormik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
    validationSchema: profileValidationSchema,
    onSubmit: (values) => {
      updateProfileMutation.mutate(values);
    },
  });
  
  // Password form setup
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validationSchema: passwordValidationSchema,
    onSubmit: (values) => {
      updatePasswordMutation.mutate({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
    },
  });
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Profile Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className={`px-6 py-3 text-sm font-medium ${
              !passwordMode 
                ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-400 dark:border-primary-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setPasswordMode(false)}
          >
            Profile Information
          </button>
          <button
            type="button"
            className={`px-6 py-3 text-sm font-medium ${
              passwordMode 
                ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-400 dark:border-primary-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setPasswordMode(true)}
          >
            Change Password
          </button>
        </div>
        
        {/* Success/Error messages */}
        {updateSuccess && (
          <div className="m-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400 dark:text-green-300" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {passwordMode ? 'Password updated successfully' : 'Profile updated successfully'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {updateError && (
          <div className="m-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{updateError}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6">
          {/* Profile Form */}
          {!passwordMode && (
            <form onSubmit={profileFormik.handleSubmit} className="space-y-6">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={profileFormik.values.firstName}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        profileFormik.touched.firstName && profileFormik.errors.firstName 
                          ? 'border-red-300 dark:border-red-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
                    />
                    {profileFormik.touched.firstName && profileFormik.errors.firstName && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{profileFormik.errors.firstName}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={profileFormik.values.lastName}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        profileFormik.touched.lastName && profileFormik.errors.lastName 
                          ? 'border-red-300 dark:border-red-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
                    />
                    {profileFormik.touched.lastName && profileFormik.errors.lastName && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{profileFormik.errors.lastName}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profileFormik.values.email}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    className={`appearance-none block w-full pl-10 px-3 py-2 border ${
                      profileFormik.touched.email && profileFormik.errors.email 
                        ? 'border-red-300 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
                  />
                </div>
                {profileFormik.touched.email && profileFormik.errors.email && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{profileFormik.errors.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                    disabled
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                >
                  {updateProfileMutation.isLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
          
          {/* Password Form */}
          {passwordMode && (
            <form onSubmit={passwordFormik.handleSubmit} className="space-y-6">
              <div className="mb-6">
                <KeyIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <h2 className="mt-2 text-center text-lg font-medium text-gray-900 dark:text-white">
                  Change Your Password
                </h2>
                <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
                  Enter your current password and a new password.
                </p>
              </div>
              
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <div className="mt-1">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordFormik.values.currentPassword}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword 
                        ? 'border-red-300 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
                  />
                  {passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordFormik.errors.currentPassword}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordFormik.values.newPassword}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      passwordFormik.touched.newPassword && passwordFormik.errors.newPassword 
                        ? 'border-red-300 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
                  />
                  {passwordFormik.touched.newPassword && passwordFormik.errors.newPassword && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordFormik.errors.newPassword}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordFormik.values.confirmPassword}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword 
                        ? 'border-red-300 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
                  />
                  {passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordFormik.errors.confirmPassword}</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updatePasswordMutation.isLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                >
                  {updatePasswordMutation.isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
