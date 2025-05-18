import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { getAssessments } from '../../api/assessment';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import { 
  ClipboardDocumentListIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ArrowPathIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AssessmentList = () => {
  const { user } = useAuth();
  const isInstructorOrAdmin = ['instructor', 'admin'].includes(user?.role);

  // Filtering state
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1
  });

  // Fetch assessments with filters
  const { data, isLoading, isError, refetch } = useQuery(
    ['assessments', filters],
    () => getAssessments(filters),
    { keepPreviousData: true }
  );

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset page when filter changes
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assessments</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {isInstructorOrAdmin 
              ? 'Manage and monitor assessments' 
              : 'View available and completed assessments'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {isInstructorOrAdmin && (
            <Link
              to="/create-assessment"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Assessment
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:px-6 rounded-md mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4">
          <form 
            onSubmit={handleSearch}
            className="w-full md:w-1/3"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Search assessments..."
              />
            </div>
          </form>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
            <div className="flex items-center">
              <FunnelIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
              
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Status</option>
                {isInstructorOrAdmin && (
                  <>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </>
                )}
                {!isInstructorOrAdmin && (
                  <>
                    <option value="available">Available</option>
                    <option value="completed">Completed</option>
                    <option value="upcoming">Upcoming</option>
                  </>
                )}
              </select>
            </div>
            
            <button
              type="button"
              onClick={() => refetch()}
              className="py-2 px-3 flex items-center text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading assessments...</p>
          </div>
        ) : isError ? (
          <div className="p-6 text-center">
            <p className="text-red-500 dark:text-red-400">Error loading assessments. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Try again
            </button>
          </div>
        ) : data?.assessments?.length === 0 ? (
          <div className="p-6 text-center">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assessments</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filters.search || filters.status
                ? 'No assessments match your filters.'
                : isInstructorOrAdmin
                ? 'Get started by creating a new assessment.'
                : 'There are no assessments available at this time.'}
            </p>
            {isInstructorOrAdmin && (
              <div className="mt-6">
                <Link
                  to="/create-assessment"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Assessment
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.assessments.map((assessment) => (
                <li key={assessment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <Link to={`/assessments/${assessment._id}`} className="block">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-md p-2">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {assessment.title}
                            </p>
                            <div className="flex mt-1">
                              <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <ClockIcon className="flex-shrink-0 mr-1 h-4 w-4" />
                                {assessment.duration} minutes
                              </span>
                              <span className="ml-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
                                {assessment.questions?.length || 0} questions
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${assessment.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              assessment.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}
                          >
                            {assessment.status === 'published' ? 'Published' : 
                             assessment.status === 'draft' ? 'Draft' : 'Archived'}
                          </p>
                          {assessment.startTime && assessment.endTime && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Available: {new Date(assessment.startTime).toLocaleDateString()} - {new Date(assessment.endTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {assessment.description && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {assessment.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600 dark:disabled:bg-gray-800"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(data.pages, filters.page + 1))}
                    disabled={filters.page === data.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600 dark:disabled:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{(filters.page - 1) * 10 + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(filters.page * 10, data.total)}
                      </span>{' '}
                      of <span className="font-medium">{data.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                        disabled={filters.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:disabled:bg-gray-800"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers - show 5 pages max with current in the middle when possible */}
                      {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                        let pageNum;
                        if (data.pages <= 5) {
                          pageNum = i + 1;
                        } else if (filters.page <= 3) {
                          pageNum = i + 1;
                        } else if (filters.page >= data.pages - 2) {
                          pageNum = data.pages - 4 + i;
                        } else {
                          pageNum = filters.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === filters.page
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(Math.min(data.pages, filters.page + 1))}
                        disabled={filters.page === data.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:disabled:bg-gray-800"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AssessmentList;
