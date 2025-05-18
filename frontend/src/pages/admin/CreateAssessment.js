import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getQuestions } from '../../api/questions';
import { createAssessment, getAssessment, updateAssessment } from '../../api/assessment';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import { 
  CheckIcon, 
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const CreateAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Check if we're editing an existing assessment
  const isEditing = location.state?.assessmentId ? true : false;
  const assessmentId = location.state?.assessmentId;
  
  // State for the assessment form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    duration: 60,
    passingScore: 0,
    totalPoints: 0,
    questions: [],
    randomizeQuestions: false,
    allowedAttempts: 1,
    proctoring: {
      enabled: false,
      webcamRequired: false,
      screensharingRequired: false,
      lockdownBrowserRequired: false
    },
    startTime: '',
    endTime: '',
    status: 'draft'
  });
  
  // State for search and selected questions
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    tags: [],
    page: 1
  });
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionPool, setQuestionPool] = useState([]);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isQuestionPoolOpen, setIsQuestionPoolOpen] = useState(false);
  
  // Fetch questions for the question pool
  const { data: questionData, isLoading: isQuestionsLoading } = useQuery(
    ['questions', filters, search],
    () => getQuestions({ ...filters, search }),
    { keepPreviousData: true }
  );
  
  // Fetch assessment details if editing
  const { data: assessmentData, isLoading: isAssessmentLoading } = useQuery(
    ['assessment', assessmentId],
    () => getAssessment(assessmentId),
    { 
      enabled: isEditing && !!assessmentId,
      onSuccess: (data) => {
        // Format dates for the form
        const formattedData = {
          ...data,
          startTime: data.startTime ? new Date(data.startTime).toISOString().slice(0, 16) : '',
          endTime: data.endTime ? new Date(data.endTime).toISOString().slice(0, 16) : '',
        };
        setFormData(formattedData);
        
        // Set selected questions
        if (data.questions && data.questions.length > 0) {
          setSelectedQuestions(data.questions);
        }
      }
    }
  );
  
  // Update the question pool when questions are fetched
  useEffect(() => {
    if (questionData?.questions) {
      setQuestionPool(questionData.questions);
    }
  }, [questionData]);
  
  // Calculate total points when selected questions change
  useEffect(() => {
    const total = selectedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    setFormData(prev => ({
      ...prev,
      totalPoints: total
    }));
  }, [selectedQuestions]);
  
  // Mutations for create/update
  const createMutation = useMutation(createAssessment, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('assessments');
      navigate(`/assessments/${data._id}`);
    },
    onError: (error) => {
      console.error('Create assessment error:', error);
      setErrors({ form: error.response?.data?.message || 'Failed to create assessment' });
      setIsSubmitting(false);
    }
  });
  
  const updateMutation = useMutation(
    (data) => updateAssessment(assessmentId, data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('assessments');
        queryClient.invalidateQueries(['assessment', assessmentId]);
        navigate(`/assessments/${data._id}`);
      },
      onError: (error) => {
        console.error('Update assessment error:', error);
        setErrors({ form: error.response?.data?.message || 'Failed to update assessment' });
        setIsSubmitting(false);
      }
    }
  );
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Clear related errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Handle search change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset page when filter changes
    }));
  };
  
  // Handle question selection
  const handleSelectQuestion = (question) => {
    const isAlreadySelected = selectedQuestions.some(q => q._id === question._id);
    
    if (isAlreadySelected) {
      // If already selected, remove it
      setSelectedQuestions(prev => prev.filter(q => q._id !== question._id));
    } else {
      // Add to selected with default points from the question
      setSelectedQuestions(prev => [
        ...prev, 
        { 
          ...question,
          points: question.points || 1 
        }
      ]);
    }
  };
  
  // Handle updating points for a selected question
  const handleUpdatePoints = (questionId, points) => {
    setSelectedQuestions(prev => 
      prev.map(q => q._id === questionId ? { ...q, points } : q)
    );
  };
  
  // Handle removing a question from the selection
  const handleRemoveQuestion = (questionId) => {
    setSelectedQuestions(prev => prev.filter(q => q._id !== questionId));
  };
  
  // Handle reordering questions
  const moveQuestion = (fromIndex, toIndex) => {
    setSelectedQuestions(prev => {
      const questions = [...prev];
      const [removed] = questions.splice(fromIndex, 1);
      questions.splice(toIndex, 0, removed);
      return questions;
    });
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title) {
      newErrors.title = 'Title is required';
    }
    
    if (formData.duration < 1) {
      newErrors.duration = 'Duration must be at least 1 minute';
    }
    
    if (selectedQuestions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }
    
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (start >= end) {
        newErrors.dateRange = 'End time must be after start time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Prepare data for submission
    const submissionData = {
      ...formData,
      questions: selectedQuestions.map(question => ({
        question: question._id,
        points: question.points
      }))
    };
    
    // Submit the form
    try {
      if (isEditing) {
        updateMutation.mutate(submissionData);
      } else {
        createMutation.mutate(submissionData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ form: error.message });
      setIsSubmitting(false);
    }
  };
  
  // Handle publishing
  const handlePublish = () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Prepare data for submission
    const submissionData = {
      ...formData,
      questions: selectedQuestions.map(question => ({
        question: question._id,
        points: question.points
      })),
      status: 'published'
    };
    
    // Submit the form
    try {
      if (isEditing) {
        updateMutation.mutate(submissionData);
      } else {
        createMutation.mutate(submissionData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ form: error.message });
      setIsSubmitting(false);
    }
  };
  
  if (isEditing && isAssessmentLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading assessment...</span>
      </div>
    );
  }
  
  return (
    <div className="container px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Assessment' : 'Create New Assessment'}
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {isEditing 
            ? 'Update your assessment details and questions' 
            : 'Configure your assessment details and add questions'}
        </p>
      </div>
      
      {errors.form && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
          <p className="text-red-600 dark:text-red-400">{errors.form}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details Section */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Details</h2>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title *
              </label>
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
              <input
                type="text"
                name="title"
                id="title"
                value={formData.title}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="Assessment title"
                required
              />
            </div>
            
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="Brief description of the assessment"
              ></textarea>
            </div>
            
            <div className="sm:col-span-6">
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Instructions
              </label>
              <textarea
                id="instructions"
                name="instructions"
                rows="4"
                value={formData.instructions}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="Instructions for test takers"
              ></textarea>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Include any specific instructions, allowed resources, or other guidelines.
              </p>
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Duration (minutes) *
              </label>
              {errors.duration && (
                <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
              )}
              <input
                type="number"
                name="duration"
                id="duration"
                min="1"
                value={formData.duration}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                required
              />
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Passing Score (%)
              </label>
              <input
                type="number"
                name="passingScore"
                id="passingScore"
                min="0"
                max="100"
                value={formData.passingScore}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="allowedAttempts" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Allowed Attempts
              </label>
              <input
                type="number"
                name="allowedAttempts"
                id="allowedAttempts"
                min="1"
                value={formData.allowedAttempts}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>
            
            <div className="sm:col-span-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="randomizeQuestions"
                    name="randomizeQuestions"
                    type="checkbox"
                    checked={formData.randomizeQuestions}
                    onChange={handleChange}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="randomizeQuestions" className="font-medium text-gray-700 dark:text-gray-300">
                    Randomize Questions
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    Present questions in a random order for each attempt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scheduling Section */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Scheduling</h2>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Time (optional)
              </label>
              <input
                type="datetime-local"
                name="startTime"
                id="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Time (optional)
              </label>
              <input
                type="datetime-local"
                name="endTime"
                id="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>
            
            {errors.dateRange && (
              <div className="sm:col-span-6">
                <p className="text-red-500 text-sm">{errors.dateRange}</p>
              </div>
            )}
            
            <div className="sm:col-span-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                If you don't set a start/end time, the assessment will be available indefinitely once published.
              </p>
            </div>
          </div>
        </div>
        
        {/* Proctoring Settings */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Proctoring Settings</h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="proctoring.enabled"
                  name="proctoring.enabled"
                  type="checkbox"
                  checked={formData.proctoring.enabled}
                  onChange={handleChange}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="proctoring.enabled" className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Proctoring
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Monitor test takers for suspicious behavior during the assessment.
                </p>
              </div>
            </div>
            
            {formData.proctoring.enabled && (
              <div className="pl-7 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="proctoring.webcamRequired"
                      name="proctoring.webcamRequired"
                      type="checkbox"
                      checked={formData.proctoring.webcamRequired}
                      onChange={handleChange}
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="proctoring.webcamRequired" className="font-medium text-gray-700 dark:text-gray-300">
                      Webcam Required
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Test takers must enable their webcam during the assessment.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="proctoring.screensharingRequired"
                      name="proctoring.screensharingRequired"
                      type="checkbox"
                      checked={formData.proctoring.screensharingRequired}
                      onChange={handleChange}
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="proctoring.screensharingRequired" className="font-medium text-gray-700 dark:text-gray-300">
                      Screen Sharing Required
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Test takers must share their screen during the assessment.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="proctoring.lockdownBrowserRequired"
                      name="proctoring.lockdownBrowserRequired"
                      type="checkbox"
                      checked={formData.proctoring.lockdownBrowserRequired}
                      onChange={handleChange}
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="proctoring.lockdownBrowserRequired" className="font-medium text-gray-700 dark:text-gray-300">
                      Lockdown Browser Required
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Prevent test takers from accessing other applications or websites.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Questions Section */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Questions
            </h2>
            <button
              type="button"
              onClick={() => setIsQuestionPoolOpen(prev => !prev)}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Questions
            </button>
          </div>
          
          {errors.questions && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-red-600 dark:text-red-400">{errors.questions}</p>
            </div>
          )}
          
          {/* Question Pool (when opened) */}
          {isQuestionPoolOpen && (
            <div className="mb-6 border border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="p-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-300 dark:border-gray-600">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={search}
                      onChange={handleSearchChange}
                      placeholder="Search questions..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      name="type"
                      value={filters.type}
                      onChange={handleFilterChange}
                      className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
                      className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">All Difficulties</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-4">
                {isQuestionsLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Loading questions...</p>
                  </div>
                ) : questionPool.length === 0 ? (
                  <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No questions found. Try adjusting your search or filters.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {questionPool.map(question => {
                      const isSelected = selectedQuestions.some(q => q._id === question._id);
                      
                      return (
                        <div 
                          key={question._id} 
                          className={`p-3 rounded-md border flex items-start ${
                            isSelected ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700' : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-1 gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                {
                                  'easy': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                                  'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                                  'hard': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }[question.difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {question.difficulty?.charAt(0).toUpperCase() + question.difficulty?.slice(1)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`}>
                                {question.type?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {question.points || 1} point{(question.points || 1) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                              {question.content?.text}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectQuestion(question)}
                            className={`ml-3 p-1.5 rounded-full ${
                              isSelected 
                              ? 'bg-primary-500 text-white hover:bg-primary-600' 
                              : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            {isSelected ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <PlusIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Pool Pagination */}
              {questionData?.pagination && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-300 dark:border-gray-600 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{((questionData.pagination.currentPage - 1) * questionData.pagination.perPage) + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(questionData.pagination.currentPage * questionData.pagination.perPage, questionData.pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{questionData.pagination.total}</span> questions
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={questionData.pagination.currentPage === 1}
                      className={`px-2 py-1 border border-gray-300 dark:border-gray-600 rounded ${
                        questionData.pagination.currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={questionData.pagination.currentPage === questionData.pagination.totalPages}
                      className={`px-2 py-1 border border-gray-300 dark:border-gray-600 rounded ${
                        questionData.pagination.currentPage === questionData.pagination.totalPages 
                          ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Selected Questions */}
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
                Selected Questions ({selectedQuestions.length})
              </h3>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Points: {formData.totalPoints}
              </div>
            </div>
            
            {selectedQuestions.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">No questions selected. Click "Add Questions" to select from your question bank.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedQuestions.map((question, index) => (
                  <div 
                    key={question._id || index} 
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm mr-3">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1 gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              {
                                'easy': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                                'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                                'hard': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }[question.difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {question.difficulty?.charAt(0).toUpperCase() + question.difficulty?.slice(1)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`}>
                              {question.type?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                            {question.content?.text}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 ml-4">
                        <div className="flex items-center">
                          <label htmlFor={`points-${question._id}`} className="text-sm text-gray-700 dark:text-gray-300 mr-2">
                            Points:
                          </label>
                          <input
                            type="number"
                            id={`points-${question._id}`}
                            min="1"
                            value={question.points}
                            onChange={(e) => handleUpdatePoints(question._id, parseInt(e.target.value) || 1)}
                            className="w-16 p-1 text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                          />
                        </div>
                        
                        {/* Move up/down buttons */}
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, Math.max(0, index - 1))}
                          disabled={index === 0}
                          className={`p-1 rounded-md ${
                            index === 0 
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <ChevronUpIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, Math.min(selectedQuestions.length - 1, index + 1))}
                          disabled={index === selectedQuestions.length - 1}
                          className={`p-1 rounded-md ${
                            index === selectedQuestions.length - 1
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <ChevronDownIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(question._id)}
                          className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
                Saving...
              </>
            ) : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
                Publishing...
              </>
            ) : 'Save & Publish'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAssessment;
