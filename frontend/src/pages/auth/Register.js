import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [registrationError, setRegistrationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation schema
  const validationSchema = Yup.object({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    username: Yup.string()
      .min(3, 'Username must be at least 3 characters')
      .required('Username is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      )
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
    organizationCode: Yup.string(),
    role: Yup.string().oneOf(['student', 'instructor']).required('Role is required')
  });

  // Initialize formik
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationCode: '',
      role: 'student'
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      setRegistrationError('');

      try {
        const userData = {
          firstName: values.firstName,
          lastName: values.lastName,
          username: values.username,
          email: values.email,
          password: values.password,
          role: values.role,
          organizationCode: values.organizationCode || undefined
        };

        await register(userData);
        navigate('/');
      } catch (error) {
        setRegistrationError(
          error.response?.data?.message || 'Registration failed. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  return (
    <div>
      <h2 className="text-center text-2xl font-extrabold text-gray-900 dark:text-white mb-5">
        Create your account
      </h2>

      {registrationError && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 dark:bg-red-900/30 dark:border-red-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{registrationError}</p>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={formik.handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name
            </label>
            <div className="mt-1">
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`appearance-none block w-full px-3 py-2 border ${
                  formik.touched.firstName && formik.errors.firstName 
                    ? 'border-red-300 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
              />
              {formik.touched.firstName && formik.errors.firstName && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.firstName}</p>
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
                autoComplete="family-name"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`appearance-none block w-full px-3 py-2 border ${
                  formik.touched.lastName && formik.errors.lastName 
                    ? 'border-red-300 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
              />
              {formik.touched.lastName && formik.errors.lastName && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.lastName}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`appearance-none block w-full px-3 py-2 border ${
                formik.touched.username && formik.errors.username 
                  ? 'border-red-300 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
            />
            {formik.touched.username && formik.errors.username && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.username}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`appearance-none block w-full px-3 py-2 border ${
                formik.touched.email && formik.errors.email 
                  ? 'border-red-300 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.email}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`appearance-none block w-full px-3 py-2 border ${
                formik.touched.password && formik.errors.password 
                  ? 'border-red-300 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
            />
            {formik.touched.password && formik.errors.password && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.password}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm Password
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`appearance-none block w-full px-3 py-2 border ${
                formik.touched.confirmPassword && formik.errors.confirmPassword 
                  ? 'border-red-300 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
            />
            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Role
          </label>
          <div className="mt-1">
            <select
              id="role"
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`appearance-none block w-full px-3 py-2 border ${
                formik.touched.role && formik.errors.role 
                  ? 'border-red-300 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
            {formik.touched.role && formik.errors.role && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.role}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="organizationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Organization Code (Optional)
          </label>
          <div className="mt-1">
            <input
              id="organizationCode"
              name="organizationCode"
              type="text"
              value={formik.values.organizationCode}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`appearance-none block w-full px-3 py-2 border ${
                formik.touched.organizationCode && formik.errors.organizationCode 
                  ? 'border-red-300 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm`}
            />
            {formik.touched.organizationCode && formik.errors.organizationCode && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formik.errors.organizationCode}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed dark:disabled:bg-primary-800"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </span>
            ) : (
              'Register'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
