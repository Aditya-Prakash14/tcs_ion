import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getQuestions, deleteQuestion, importQuestions, exportQuestions } from '../../api/questions';
import { useAuth } from '../../contexts/AuthContext';
import QuestionForm from '../../components/questions/QuestionForm';
import QuestionCard from '../../components/questions/QuestionCard';
import ImportExportModal from '../../components/questions/ImportExportModal';

// Icons
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon,
  FunnelIcon,
  XMarkIcon,
  TagIcon
} from '@heroicons/react/24/outline';

const QuestionBank = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isInstructorOrAdmin = ['instructor', 'admin'].includes(user?.role);

  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    search: '',
    tags: [],
    page: 1
  });
  const [activeTags, setActiveTags] = useState([]);

  // Fetch questions with filters
  const { data, isLoading, isError } = useQuery(
    ['questions', filters],
    () => getQuestions(filters),
    { keepPreviousData: true }
  );

  // Delete question mutation
  const deleteMutation = useMutation(deleteQuestion, {
    onSuccess: () => {
      queryClient.invalidateQueries('questions');
    },
  });

  // Handle question deletion
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      await deleteMutation.mutate(id);
    }
  };

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
    // The filter changes will trigger the query automatically
  };

  // Handle tag selection
  const handleTagSelect = (tag) => {
    if (!activeTags.includes(tag)) {
      const newTags = [...activeTags, tag];
      setActiveTags(newTags);
      setFilters(prev => ({
        ...prev,
        tags: newTags,
        page: 1
      }));
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove) => {
    const newTags = activeTags.filter(tag => tag !== tagToRemove);
    setActiveTags(newTags);
    setFilters(prev => ({
      ...prev,
      tags: newTags,
      page: 1
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await exportQuestions(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `questions-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export questions.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Question Bank</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage and organize your assessment questions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 space-x-3">
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => {
              setSelectedQuestion(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Question
          </button>
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
                placeholder="Search questions..."
              />
            </div>
          </form>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Types</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="single-choice">Single Choice</option>
              <option value="true-false">True/False</option>
              <option value="fill-in-the-blank">Fill in the Blank</option>
              <option value="essay">Essay</option>
              <option value="coding">Coding</option>
            </select>

            <select
              name="difficulty"
              value={filters.difficulty}
              onChange={handleFilterChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button
              type="button"
              onClick={() => setFilters({
                type: '',
                difficulty: '',
                search: '',
                tags: [],
                page: 1
              })}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active tags */}
        {activeTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeTags.map(tag => (
              <span 
                key={tag}
                className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-800 dark:text-gray-200"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                setActiveTags([]);
                setFilters(prev => ({
                  ...prev,
                  tags: [],
                  page: 1
                }));
              }}
              className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Questions grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading questions...</span>
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-center">
          <p className="text-red-600 dark:text-red-400">
            Failed to load questions. Please try again later.
          </p>
        </div>
      ) : data?.questions?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow px-4 py-12 sm:px-6 rounded-md text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No questions found.</p>
          <button
            onClick={() => {
              setSelectedQuestion(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create your first question
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.questions?.map(question => (
              <QuestionCard
                key={question._id}
                question={question}
                onEdit={() => {
                  setSelectedQuestion(question);
                  setIsModalOpen(true);
                }}
                onDelete={() => handleDelete(question._id)}
                onTagClick={handleTagSelect}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {data?.pagination && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                  disabled={data.pagination.currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    data.pagination.currentPage === 1 
                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700' 
                    : 'text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                  disabled={data.pagination.currentPage === data.pagination.totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    data.pagination.currentPage === data.pagination.totalPages
                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
                    : 'text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{((data.pagination.currentPage - 1) * data.pagination.perPage) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(data.pagination.currentPage * data.pagination.perPage, data.pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{data.pagination.total}</span> questions
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                      disabled={data.pagination.currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 ${
                        data.pagination.currentPage === 1 ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: Math.min(5, data.pagination.totalPages) }).map((_, idx) => {
                      // Logic to show pages around current page
                      let pageNum;
                      const totalPages = data.pagination.totalPages;
                      const currentPage = data.pagination.currentPage;
                      
                      if (totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + idx;
                      } else {
                        pageNum = currentPage - 2 + idx;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-900 dark:text-primary-200'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                      disabled={data.pagination.currentPage === data.pagination.totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 ${
                        data.pagination.currentPage === data.pagination.totalPages ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Question Form Modal */}
      {isModalOpen && (
        <QuestionForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          question={selectedQuestion}
        />
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <ImportExportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={importQuestions}
        />
      )}
    </div>
  );
};

export default QuestionBank;
