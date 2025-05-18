import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getAssessmentResults } from '../../api/assessment';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  HomeIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const Results = () => {
  const { id } = useParams(); // attempt ID
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch assessment results
  const { data, isLoading, isError, error } = useQuery(
    ['assessment-results', id],
    () => getAssessmentResults(id),
    { enabled: !!id }
  );
  
  // Format time to display
  const formatTime = (seconds) => {
    if (!seconds) return '0min 0sec';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${mins}min ${secs}sec`;
  };
  
  // Calculate percentage score
  const calculatePercentage = (score, total) => {
    if (!total) return 0;
    return Math.round((score / total) * 100);
  };
  
  // Determine if the user passed the assessment
  const isPassed = (score, total, passingScore) => {
    const percentage = calculatePercentage(score, total);
    return percentage >= passingScore;
  };
  
  // Function to render the result header (pass/fail)
  const renderResultHeader = () => {
    const passed = isPassed(
      data.result.totalScore, 
      data.result.maxPossibleScore,
      data.assessment.passingScore
    );
    
    return (
      <div className={`p-6 rounded-t-lg ${
        passed 
          ? 'bg-green-100 dark:bg-green-900/30' 
          : 'bg-red-100 dark:bg-red-900/30'
      }`}>
        <div className="flex items-center">
          {passed ? (
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
          ) : (
            <XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400 mr-3" />
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {passed ? 'Passed' : 'Failed'}
            </h2>
            <p className={`text-sm ${
              passed 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-red-700 dark:text-red-300'
            }`}>
              {passed 
                ? `Congratulations! You've passed the assessment.` 
                : `You did not meet the passing score of ${data.assessment.passingScore}%.`
              }
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading results...</span>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">Failed to load assessment results.</p>
        <p className="text-gray-700 dark:text-gray-300">{error?.message || 'Please try again later.'}</p>
        <button
          onClick={() => navigate('/assessments')}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Back to Assessments
        </button>
      </div>
    );
  }
  
  const { result, assessment } = data;
  const scorePercentage = calculatePercentage(result.totalScore, result.maxPossibleScore);
  const passed = isPassed(result.totalScore, result.maxPossibleScore, assessment.passingScore);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/assessments"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Back to Assessments
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
        {renderResultHeader()}
        
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {assessment.title}
          </h1>
          
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            <ClockIcon className="h-4 w-4 mr-1" />
            <span>
              Completed on {new Date(result.endTime).toLocaleDateString()} at {new Date(result.endTime).toLocaleTimeString()}
            </span>
          </div>
          
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Score</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {result.totalScore} / {result.maxPossibleScore}
              </div>
              <div className="mt-1 text-sm">
                <span className={`font-medium ${
                  passed 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {scorePercentage}%
                </span>
                <span className="text-gray-500 dark:text-gray-400"> (Passing: {assessment.passingScore}%)</span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Completion Time</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatTime(result.completionTime)}
              </div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Duration limit: {assessment.duration} minutes
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Questions</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {result.answers.filter(a => a.isCorrect).length} / {result.answers.length}
              </div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Answered correctly
              </div>
            </div>
          </div>
          
          {/* Score Chart - simplified for demo */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-gray-500" />
              Performance Overview
            </h2>
            
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${passed ? 'bg-green-500' : 'bg-red-500'}`} 
                style={{ width: `${scorePercentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div>0%</div>
              <div className="font-medium">{scorePercentage}%</div>
              <div>100%</div>
            </div>
          </div>
          
          {/* Proctoring Violations (if any) */}
          {result.proctorEvents && result.proctorEvents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <ExclamationCircleIcon className="h-5 w-5 mr-2 text-yellow-500" />
                Proctoring Flags ({result.proctorEvents.length})
              </h2>
              
              <div className="border border-yellow-200 dark:border-yellow-900 rounded-lg overflow-hidden">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 border-b border-yellow-200 dark:border-yellow-900">
                  <div className="grid grid-cols-12 text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    <div className="col-span-2">Time</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-7">Details</div>
                  </div>
                </div>
                
                <div className="divide-y divide-yellow-200 dark:divide-yellow-900">
                  {result.proctorEvents.map((event, index) => (
                    <div key={index} className="px-4 py-3 bg-white dark:bg-gray-800">
                      <div className="grid grid-cols-12 text-sm">
                        <div className="col-span-2 text-gray-600 dark:text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="col-span-3 font-medium text-gray-900 dark:text-white">
                          {event.type.split('-').map(
                            word => word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </div>
                        <div className="col-span-7 text-gray-600 dark:text-gray-400">
                          {event.details?.message || 'No details provided'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Question Breakdown */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
              Detailed Results
            </h2>
            
            <div className="space-y-6">
              {result.answers.map((answer, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg overflow-hidden ${
                    answer.isCorrect 
                      ? 'border-green-200 dark:border-green-900' 
                      : 'border-red-200 dark:border-red-900'
                  }`}
                >
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    answer.isCorrect 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                  }`}>
                    <div className="flex items-center">
                      {answer.isCorrect ? (
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 mr-2" />
                      )}
                      <span className="font-medium">Question {index + 1}</span>
                    </div>
                    <div className="text-sm">
                      {answer.isCorrect ? (
                        <span>{answer.points} point{answer.points !== 1 ? 's' : ''}</span>
                      ) : (
                        <span>0 / {answer.points} points</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 bg-white dark:bg-gray-800">
                    <p className="text-gray-900 dark:text-white mb-4">
                      {answer.question.content?.text}
                    </p>
                    
                    {/* Display user's answer */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Answer:</h4>
                      
                      <div className="text-gray-600 dark:text-gray-400">
                        {answer.question.type === 'multiple-choice' || answer.question.type === 'single-choice' ? (
                          <div>
                            {answer.question.options
                              .filter(opt => (answer.answer || []).includes(opt.id))
                              .map(opt => opt.text)
                              .join(', ') || 'No answer provided'}
                          </div>
                        ) : answer.question.type === 'true-false' ? (
                          <div>{answer.answer === 'true' ? 'True' : answer.answer === 'false' ? 'False' : 'No answer provided'}</div>
                        ) : (
                          <div>
                            {answer.answer ? (
                              answer.question.type === 'coding' ? (
                                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md overflow-x-auto text-sm">{answer.answer}</pre>
                              ) : (
                                answer.answer
                              )
                            ) : (
                              'No answer provided'
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Display correct answer */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Answer:</h4>
                      
                      <div className="text-gray-600 dark:text-gray-400">
                        {answer.question.type === 'multiple-choice' || answer.question.type === 'single-choice' ? (
                          <div>
                            {answer.question.options
                              .filter(opt => opt.isCorrect)
                              .map(opt => opt.text)
                              .join(', ')}
                          </div>
                        ) : answer.question.type === 'true-false' ? (
                          <div>
                            {answer.question.options.find(opt => opt.isCorrect)?.text || 
                              (answer.question.correctAnswer === 'true' ? 'True' : 'False')}
                          </div>
                        ) : (
                          <div>
                            {answer.question.correctAnswer ? (
                              answer.question.type === 'coding' ? (
                                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md overflow-x-auto text-sm">{answer.question.correctAnswer}</pre>
                              ) : (
                                answer.question.correctAnswer
                              )
                            ) : (
                              'No answer key provided'
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Time spent on question */}
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Time spent: {formatTime(answer.timeSpent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center md:justify-start space-x-4">
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <HomeIcon className="h-5 w-5 mr-2" />
          Dashboard
        </Link>
        <Link
          to="/assessments"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
          All Assessments
        </Link>
      </div>
    </div>
  );
};

export default Results;
