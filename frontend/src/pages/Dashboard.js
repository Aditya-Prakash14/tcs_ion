import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { getAssessments } from '../api/assessment';
import { useAuth } from '../contexts/AuthContext';

// Icons
import { 
  ClipboardDocumentListIcon, 
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor';

  // Fetch upcoming assessments for students or created assessments for instructors/admins
  const { data: assessments, isLoading } = useQuery(
    ['assessments', { limit: 5 }],
    () => getAssessments({
      limit: 5,
      ...(isAdmin || isInstructor ? {} : { status: 'published' })
    }),
    {
      enabled: !!user
    }
  );

  const renderWelcomeSection = () => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Welcome back, {user?.firstName || 'User'}!
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {isAdmin ? (
            'Manage your organization, users, and assessments from your dashboard.'
          ) : isInstructor ? (
            'Create and manage assessments, and monitor student progress.'
          ) : (
            'View upcoming assessments and check your recent results.'
          )}
        </p>
      </div>
    </div>
  );

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900 rounded-md p-3">
              <ClipboardDocumentListIcon className="h-6 w-6 text-primary-600 dark:text-primary-200" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {isAdmin || isInstructor ? 'Total Assessments' : 'Available Assessments'}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {isLoading ? '...' : assessments?.total || 0}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-md p-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-200" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {isAdmin || isInstructor ? 'Completed Assessments' : 'Completed Tests'}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {isLoading ? '...' : '12'}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-md p-3">
              <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-200" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {isAdmin || isInstructor ? 'Pending Reviews' : 'Upcoming Tests'}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {isLoading ? '...' : '3'}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-secondary-100 dark:bg-secondary-900 rounded-md p-3">
              <ChartBarIcon className="h-6 w-6 text-secondary-600 dark:text-secondary-200" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {isAdmin || isInstructor ? 'Total Users' : 'Average Score'}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {isLoading ? '...' : isAdmin || isInstructor ? '45' : '78%'}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssessmentsList = () => (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md mb-6">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          {isAdmin || isInstructor ? 'Recent Assessments' : 'Upcoming Assessments'}
        </h3>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {isLoading ? (
          <li className="px-4 py-4 sm:px-6">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </li>
        ) : assessments?.assessments?.length === 0 ? (
          <li className="px-4 py-4 sm:px-6 text-center text-gray-500 dark:text-gray-400">
            No assessments available.
          </li>
        ) : (
          assessments?.assessments?.map(assessment => (
            <li key={assessment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <Link to={`/assessments/${assessment._id}`} className="block">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClipboardDocumentListIcon className="h-8 w-8 text-primary-500" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {assessment.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {assessment.description?.length > 100 
                            ? `${assessment.description.substring(0, 100)}...` 
                            : assessment.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {assessment.duration} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
      <div className="px-4 py-4 sm:px-6 text-right">
        <Link
          to="/assessments"
          className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
        >
          View all assessments
          <span aria-hidden="true"> &rarr;</span>
        </Link>
      </div>
    </div>
  );

  const renderActionButtons = () => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg mb-6">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Quick Actions
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(isAdmin || isInstructor) && (
            <Link
              to="/create-assessment"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              Create New Assessment
            </Link>
          )}
          {isInstructor && (
            <Link
              to="/question-bank"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Manage Question Bank
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/organizations"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Manage Organizations
            </Link>
          )}
          {!isAdmin && !isInstructor && (
            <>
              <Link
                to="/assessments"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                Take an Assessment
              </Link>
              <Link
                to="/results"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                View Past Results
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      
      {renderWelcomeSection()}
      {renderStatsCards()}
      {renderActionButtons()}
      {renderAssessmentsList()}
    </div>
  );
};

export default Dashboard;
