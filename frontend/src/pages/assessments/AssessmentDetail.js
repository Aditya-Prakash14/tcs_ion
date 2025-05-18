import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getAssessment, startAssessment, updateAssessment } from '../../api/assessment';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import { 
  ClockIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  CheckBadgeIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const AssessmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInstructorOrAdmin = ['instructor', 'admin'].includes(user?.role);
  const [isStarting, setIsStarting] = useState(false);
  
  // Fetch assessment details
  const { data: assessment, isLoading, isError, refetch } = useQuery(
    ['assessment', id],
    () => getAssessment(id),
    { enabled: !!id }
  );

  // Start assessment attempt
  const handleStartAssessment = async () => {
    try {
      setIsStarting(true);
      const result = await startAssessment(id);
      
      // Navigate to the assessment taking page
      navigate(`/take-assessment/${id}`, { 
        state: { attemptId: result.attemptId } 
      });
    } catch (error) {
      console.error('Failed to start assessment:', error);
      alert(error.response?.data?.message || 'Failed to start assessment. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  // Handle assessment publication (for instructors/admins)
  const handlePublishAssessment = async () => {
    if (!window.confirm('Are you sure you want to publish this assessment? Students will be able to take it once published.')) {
      return;
    }

    try {
      await updateAssessment(id, { status: 'published' });
      refetch();
    } catch (error) {
      console.error('Failed to publish assessment:', error);
      alert(error.response?.data?.message || 'Failed to publish assessment. Please try again.');
    }
  };

  // Handle assessment archiving (for instructors/admins)
  const handleArchiveAssessment = async () => {
    if (!window.confirm('Are you sure you want to archive this assessment? It will no longer be available to students.')) {
      return;
    }

    try {
      await updateAssessment(id, { status: 'archived' });
      refetch();
    } catch (error) {
      console.error('Failed to archive assessment:', error);
      alert(error.response?.data?.message || 'Failed to archive assessment. Please try again.');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading assessment...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">Failed to load assessment details.</p>
        <button
          onClick={refetch}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{assessment.title}</h1>
          <div className="mt-1 flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center mr-4">
              <ClockIcon className="flex-shrink-0 mr-1 h-4 w-4" />
              Duration: {assessment.duration} minutes
            </span>
            <span className="flex items-center mr-4">
              <DocumentTextIcon className="flex-shrink-0 mr-1 h-4 w-4" />
              Questions: {assessment.questions?.length || 0}
            </span>
            <span className="flex items-center mr-4">
              <CheckBadgeIcon className="flex-shrink-0 mr-1 h-4 w-4" />
              Passing Score: {assessment.passingScore || 0} points
            </span>
            <span className={`flex items-center px-2 py-0.5 mt-1 sm:mt-0 rounded-full text-xs font-medium
              ${assessment.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                assessment.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              {assessment.status}
            </span>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-wrap sm:flex-nowrap space-y-2 sm:space-y-0 space-x-0 sm:space-x-2">
          {isInstructorOrAdmin ? (
            <>
              <Link
                to={`/assessments/${id}/edit`}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Link>
              
              {assessment.status === 'draft' && (
                <button
                  onClick={handlePublishAssessment}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Publish
                </button>
              )}
              
              {assessment.status === 'published' && (
                <button
                  onClick={handleArchiveAssessment}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Archive
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleStartAssessment}
              disabled={assessment.status !== 'published' || isStarting}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-600"
            >
              {isStarting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Starting...
                </div>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Start Assessment
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Assessment Information
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Details and settings for this assessment.
          </p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Description
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {assessment.description || 'No description provided.'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Created By
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                <UserIcon className="h-4 w-4 mr-1" />
                {assessment.createdBy || 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Organization
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {assessment.organization || 'All Organizations'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Availability Period
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {assessment.startTime && assessment.endTime 
                  ? `${formatDate(assessment.startTime)} to ${formatDate(assessment.endTime)}`
                  : 'Always available'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Allowed Attempts
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {assessment.allowedAttempts || 1}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Randomize Questions
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {assessment.randomizeQuestions ? 'Yes' : 'No'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Proctoring Enabled
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {assessment.proctoring?.enabled ? 'Yes' : 'No'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Webcam Required
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {assessment.proctoring?.webcamRequired ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {assessment.instructions && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Instructions
            </h3>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
            <div className="prose dark:prose-invert max-w-none">
              {assessment.instructions}
            </div>
          </div>
        </div>
      )}

      {isInstructorOrAdmin && assessment.questions && assessment.questions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Questions ({assessment.questions.length})
            </h3>
            <Link
              to={`/assessments/${id}/questions`}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40"
            >
              Manage Questions
            </Link>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {assessment.questions.slice(0, 5).map((q, index) => (
                <li key={q.question?._id || index} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">Q{index + 1}. </span>
                      <span className="text-gray-900 dark:text-white">
                        {q.question?.content?.text || 'Question content not available'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {q.points || 1} {q.points === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {assessment.questions.length > 5 && (
                <li className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  and {assessment.questions.length - 5} more questions...
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentDetail;
