import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
      <h1 className="text-6xl font-extrabold text-gray-900 dark:text-white">404</h1>
      <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mt-4">Page not found</p>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
      >
        Go back home
      </Link>
    </div>
  );
};

export default NotFound;
