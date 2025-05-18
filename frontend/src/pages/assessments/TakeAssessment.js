import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { getAssessment } from '../../api/assessment';
import { submitAnswer, finishAssessment, recordProctorEvent } from '../../api/assessment';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import { 
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

const TakeAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const webcamRef = useRef(null);
  const screenRef = useRef(null);
  
  // Get attemptId from location state (or query param as a fallback)
  const attemptId = location.state?.attemptId || new URLSearchParams(location.search).get('attemptId');

  // State for assessment progress
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [confirmSubmitError, setConfirmSubmitError] = useState('');
  
  // State for proctoring
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [proctorSetupComplete, setProctorSetupComplete] = useState(false);
  const [proctorError, setProctorError] = useState(null);
  const [proctorWarnings, setProctorWarnings] = useState([]);
  const proctorInterval = useRef(null);
  
  // Fetch assessment details
  const { 
    data: assessment, 
    isLoading: isAssessmentLoading, 
    error: assessmentError 
  } = useQuery(
    ['assessment', id],
    () => getAssessment(id),
    { enabled: !!id }
  );

  // Track time remaining
  useEffect(() => {
    if (!assessment) return;
    
    const durationMs = assessment.duration * 60 * 1000; // Convert minutes to milliseconds
    setTimeRemaining(durationMs);
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        
        // If time is up, auto-submit the assessment
        if (newTime <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [assessment]);

  // Initialize proctoring if required
  useEffect(() => {
    if (!assessment || !assessment.proctoring?.enabled) {
      setProctorSetupComplete(true);
      return;
    }
    
    const setupProctoring = async () => {
      try {
        // Set up webcam if required
        if (assessment.proctoring.webcamRequired) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' },
            audio: assessment.proctoring.audioMonitoring || false
          });
          setWebcamStream(stream);
          
          if (webcamRef.current) {
            webcamRef.current.srcObject = stream;
          }
        }
        
        // Set up screen sharing if required
        if (assessment.proctoring.screensharingRequired) {
          const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' },
            audio: false
          });
          setScreenStream(screenCaptureStream);
          
          if (screenRef.current) {
            screenRef.current.srcObject = screenCaptureStream;
          }
          
          // Listen for screen sharing stop
          screenCaptureStream.getVideoTracks()[0].addEventListener('ended', () => {
            // Record event when screen sharing is stopped
            recordProctorEvent(attemptId, {
              type: 'screen-sharing-stopped',
              timestamp: new Date(),
              details: {
                message: 'Screen sharing was terminated by the user'
              }
            });
            
            setProctorWarnings(prev => [...prev, {
              id: Date.now(),
              message: 'Screen sharing has been stopped. This will be recorded as a potential violation.',
              time: new Date()
            }]);
          });
        }
        
        // Setup lockdown browser if required
        if (assessment.proctoring.lockdownBrowserRequired) {
          // Listen for tab visibility changes
          document.addEventListener('visibilitychange', handleVisibilityChange);
          
          // Listen for key combos that might exit fullscreen or app
          window.addEventListener('keydown', handleKeyDown);
          
          // Request fullscreen mode
          try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
              await elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
              await elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
              await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
              await elem.msRequestFullscreen();
            }
          } catch (error) {
            console.error('Failed to enter fullscreen mode:', error);
            
            setProctorWarnings(prev => [...prev, {
              id: Date.now(),
              message: 'Failed to enter fullscreen mode. This may be recorded as a potential violation.',
              time: new Date()
            }]);
            
            // Record the event
            recordProctorEvent(attemptId, {
              type: 'fullscreen-failed',
              timestamp: new Date(),
              details: { error: error.message }
            });
          }
        }
        
        // Start periodic checks for proctoring
        if (assessment.proctoring.webcamRequired) {
          // Start face detection (simplified for demo)
          proctorInterval.current = setInterval(() => {
            // In a real app, this would use face detection libraries like face-api.js
            // For the demo, we'll just log that the check was performed
            console.log('Performing facial detection check');
            
            // Simulate occasional warnings for demo purposes
            if (Math.random() < 0.1) {
              const warningTypes = [
                'face-not-detected',
                'multiple-faces',
                'looking-away'
              ];
              
              const randomWarningType = warningTypes[Math.floor(Math.random() * warningTypes.length)];
              
              // Record the event
              recordProctorEvent(attemptId, {
                type: randomWarningType,
                timestamp: new Date(),
                details: { message: `Potential violation detected: ${randomWarningType}` }
              });
              
              setProctorWarnings(prev => [...prev, {
                id: Date.now(),
                message: `Warning: ${formatWarningMessage(randomWarningType)}`,
                time: new Date()
              }]);
            }
          }, 15000); // Check every 15 seconds
        }
        
        setProctorSetupComplete(true);
      } catch (error) {
        console.error('Proctoring setup error:', error);
        setProctorError(error.message || 'Failed to set up proctoring. Please make sure webcam and/or screen sharing is allowed.');
      }
    };
    
    setupProctoring();
    
    // Cleanup function
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      
      if (proctorInterval.current) {
        clearInterval(proctorInterval.current);
      }
      
      if (assessment?.proctoring?.lockdownBrowserRequired) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('keydown', handleKeyDown);
        
        // Exit fullscreen if we're in it
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };
  }, [assessment]);

  // Format a warning message
  const formatWarningMessage = (type) => {
    switch (type) {
      case 'face-not-detected':
        return 'Your face is not visible. Please position yourself in front of the camera.';
      case 'multiple-faces':
        return 'Multiple faces detected. Please ensure you are the only person in the frame.';
      case 'looking-away':
        return 'You appear to be looking away from the screen. Please focus on the assessment.';
      case 'tab-switch':
        return 'Switching tabs or windows is not allowed during this assessment.';
      case 'full-screen-exit':
        return 'Exiting full-screen mode is not allowed during this assessment.';
      default:
        return 'Potential violation detected. This has been recorded.';
    }
  };

  // Handle visibility change (for lockdown browser)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Record tab switch event
      recordProctorEvent(attemptId, {
        type: 'tab-switch',
        timestamp: new Date(),
        details: {
          message: 'User switched to another tab or window'
        }
      });
      
      setProctorWarnings(prev => [...prev, {
        id: Date.now(),
        message: 'Switching tabs or windows is not allowed. This will be recorded as a potential violation.',
        time: new Date()
      }]);
    }
  };

  // Handle key combinations (for lockdown browser)
  const handleKeyDown = (e) => {
    // Detect Alt+Tab, Windows key, Alt+F4, Cmd+Tab, etc.
    if (
      (e.altKey && (e.key === 'Tab' || e.key === 'F4')) ||
      e.key === 'Meta' ||
      e.key === 'OS' ||
      (e.ctrlKey && e.altKey && e.key === 'Delete') ||
      (e.key === 'F11')
    ) {
      e.preventDefault();
      
      // Record key combination event
      recordProctorEvent(attemptId, {
        type: 'restricted-key-combination',
        timestamp: new Date(),
        details: {
          key: e.key,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey
        }
      });
      
      setProctorWarnings(prev => [...prev, {
        id: Date.now(),
        message: 'Use of restricted key combinations is not allowed. This will be recorded as a potential violation.',
        time: new Date()
      }]);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (ms) => {
    if (ms === null) return '00:00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (num) => num.toString().padStart(2, '0');
    
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Handle answer change
  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Submit answer to the server
    submitAnswer(attemptId, questionId, answer)
      .catch(error => console.error('Failed to save answer:', error));
  };

  // Handle navigation to next/prev question
  const handleNavigate = (direction) => {
    if (direction === 'next' && currentQuestion < assessment?.questions?.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // Handle jumping to a specific question
  const handleJumpToQuestion = (index) => {
    setCurrentQuestion(index);
  };

  // Handle assessment submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate answers - check if all questions are answered
      const answeredQuestions = Object.keys(answers).length;
      const totalQuestions = assessment?.questions?.length || 0;
      
      if (answeredQuestions < totalQuestions) {
        setConfirmSubmitError(`You have answered ${answeredQuestions} of ${totalQuestions} questions. Are you sure you want to submit?`);
        setShowConfirmSubmit(true);
        setIsSubmitting(false);
        return;
      }
      
      await submitAssessment();
    } catch (error) {
      console.error('Submission error:', error);
      setIsSubmitting(false);
    }
  };

  // Function to handle the actual submission
  const submitAssessment = async () => {
    try {
      const result = await finishAssessment(attemptId);
      
      // Cleanup streams
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      
      // Navigate to results page
      navigate(`/results/${attemptId}`);
    } catch (error) {
      console.error('Assessment submission error:', error);
      setIsSubmitting(false);
      
      alert('Failed to submit assessment. Please try again.');
    }
  };

  // Handle confirm submission
  const handleConfirmSubmit = () => {
    setShowConfirmSubmit(false);
    submitAssessment();
  };

  // Render answer input based on question type
  const renderAnswerInput = (question) => {
    const questionId = question.question._id;
    const currentAnswer = answers[questionId] || null;
    
    switch (question.question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {question.question.options.map((option, idx) => (
              <div key={option.id || idx} className="flex items-center">
                <input
                  type="checkbox"
                  id={`option-${questionId}-${idx}`}
                  checked={(currentAnswer || []).includes(option.id)}
                  onChange={(e) => {
                    const newAnswer = e.target.checked
                      ? [...(currentAnswer || []), option.id]
                      : (currentAnswer || []).filter(id => id !== option.id);
                    handleAnswerChange(questionId, newAnswer);
                  }}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded"
                />
                <label
                  htmlFor={`option-${questionId}-${idx}`}
                  className="ml-3 block text-gray-700 dark:text-gray-200"
                >
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'single-choice':
        return (
          <div className="space-y-3">
            {question.question.options.map((option, idx) => (
              <div key={option.id || idx} className="flex items-center">
                <input
                  type="radio"
                  id={`option-${questionId}-${idx}`}
                  name={`question-${questionId}`}
                  checked={currentAnswer === option.id}
                  onChange={() => handleAnswerChange(questionId, option.id)}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600"
                />
                <label
                  htmlFor={`option-${questionId}-${idx}`}
                  className="ml-3 block text-gray-700 dark:text-gray-200"
                >
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'true-false':
        return (
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="radio"
                id={`option-${questionId}-true`}
                name={`question-${questionId}`}
                checked={currentAnswer === 'true'}
                onChange={() => handleAnswerChange(questionId, 'true')}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600"
              />
              <label
                htmlFor={`option-${questionId}-true`}
                className="ml-3 block text-gray-700 dark:text-gray-200"
              >
                True
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id={`option-${questionId}-false`}
                name={`question-${questionId}`}
                checked={currentAnswer === 'false'}
                onChange={() => handleAnswerChange(questionId, 'false')}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600"
              />
              <label
                htmlFor={`option-${questionId}-false`}
                className="ml-3 block text-gray-700 dark:text-gray-200"
              >
                False
              </label>
            </div>
          </div>
        );
      
      case 'fill-in-the-blank':
        return (
          <div>
            <input
              type="text"
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              placeholder="Your answer"
              className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            />
          </div>
        );
      
      case 'essay':
        return (
          <div>
            <textarea
              rows="8"
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              placeholder="Your answer"
              className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            ></textarea>
          </div>
        );
      
      case 'coding':
        return (
          <div>
            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              Write your code below:
            </div>
            <textarea
              rows="12"
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              placeholder="// Your code here"
              className="font-mono mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            ></textarea>
          </div>
        );
      
      default:
        return (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-yellow-600 dark:text-yellow-400">
              Question type not supported.
            </p>
          </div>
        );
    }
  };

  // Render loading state
  if (isAssessmentLoading || !proctorSetupComplete) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          {isAssessmentLoading ? 'Loading assessment...' : 'Setting up proctoring...'}
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md text-center">
          {!isAssessmentLoading && 'Please grant any requested permissions for webcam and/or screen sharing.'}
        </p>
      </div>
    );
  }
  
  // Render error state
  if (assessmentError || proctorError) {
    const errorMessage = proctorError || assessmentError?.message || 'Failed to load assessment';
    
    return (
      <div className="flex flex-col justify-center items-center h-full p-4">
        <XCircleIcon className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
        <p className="text-gray-700 dark:text-gray-300 text-center mb-6 max-w-md">
          {errorMessage}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  // Get current question
  const currentQuestionData = assessment?.questions?.[currentQuestion];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
          {assessment.title}
        </h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-gray-800 dark:text-gray-200">
            <ClockIcon className="h-5 w-5 mr-1 text-primary-500" />
            <span className="font-mono">{formatTimeRemaining(timeRemaining)}</span>
          </div>
          
          <button
            type="button"
            onClick={() => setShowConfirmSubmit(true)}
            className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
          >
            Finish
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigation Sidebar */}
        <aside className="w-64 bg-gray-50 dark:bg-gray-750 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Questions ({assessment.questions?.length || 0})
          </h2>
          
          <div className="grid grid-cols-5 gap-2">
            {assessment.questions?.map((q, index) => {
              const isAnswered = !!answers[q.question._id];
              const isCurrent = index === currentQuestion;
              
              return (
                <button
                  key={q.question._id}
                  onClick={() => handleJumpToQuestion(index)}
                  className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium 
                    ${isCurrent ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800 ' : ''}
                    ${isAnswered 
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                    }
                  `}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary-100 dark:bg-primary-900 rounded"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Answered</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Unanswered</span>
              </div>
            </div>
          </div>
          
          {/* Proctoring status */}
          {assessment.proctoring?.enabled && (
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Proctoring Status
              </h3>
              
              <div className="space-y-3">
                {assessment.proctoring.webcamRequired && (
                  <div className="flex items-center text-sm">
                    <EyeIcon className={`h-5 w-5 mr-2 ${webcamStream ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`${webcamStream ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {webcamStream ? 'Webcam active' : 'Webcam not active'}
                    </span>
                  </div>
                )}
                
                {assessment.proctoring.screensharingRequired && (
                  <div className="flex items-center text-sm">
                    <ComputerDesktopIcon className={`h-5 w-5 mr-2 ${screenStream ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`${screenStream ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {screenStream ? 'Screen sharing active' : 'Screen sharing not active'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Proctoring warnings */}
              {proctorWarnings.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-yellow-500 dark:text-yellow-400 mb-2">
                    Warnings ({proctorWarnings.length})
                  </h4>
                  
                  <div className="max-h-40 overflow-y-auto">
                    {proctorWarnings.map(warning => (
                      <div 
                        key={warning.id} 
                        className="text-xs p-2 mb-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900 rounded"
                      >
                        <div className="text-yellow-800 dark:text-yellow-300">{warning.message}</div>
                        <div className="text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(warning.time).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Webcam preview (small) */}
              {assessment.proctoring.webcamRequired && webcamStream && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Webcam Preview
                  </h4>
                  <div className="rounded bg-black overflow-hidden h-24 flex items-center justify-center">
                    <video
                      ref={webcamRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
        
        {/* Question Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentQuestionData ? (
            <div>
              {/* Question header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Question {currentQuestion + 1} of {assessment.questions?.length}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {currentQuestionData.points} point{currentQuestionData.points !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="mt-2 flex items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentQuestionData.question.type?.split('-').map(
                      word => word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                </div>
              </div>
              
              {/* Question content */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                {/* Question text */}
                <div className="prose dark:prose-invert max-w-none mb-6">
                  <p>{currentQuestionData.question.content?.text}</p>
                  
                  {/* Display image if available */}
                  {currentQuestionData.question.content?.image && (
                    <img 
                      src={currentQuestionData.question.content.image} 
                      alt="Question illustration" 
                      className="mt-4 max-h-96 rounded"
                    />
                  )}
                  
                  {/* Display code if available */}
                  {currentQuestionData.question.content?.code && (
                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto mt-4 text-sm">
                      <code>{currentQuestionData.question.content.code}</code>
                    </pre>
                  )}
                </div>
                
                {/* Answer input */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Your Answer
                  </h3>
                  
                  {renderAnswerInput(currentQuestionData)}
                </div>
              </div>
              
              {/* Navigation buttons */}
              <div className="flex justify-between mb-6">
                <button
                  type="button"
                  onClick={() => handleNavigate('prev')}
                  disabled={currentQuestion === 0}
                  className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md ${
                    currentQuestion === 0 
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-650'
                  }`}
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Previous
                </button>
                
                <button
                  type="button"
                  onClick={() => handleNavigate('next')}
                  disabled={currentQuestion === assessment.questions.length - 1}
                  className={`inline-flex items-center px-4 py-2 border ${
                    currentQuestion === assessment.questions.length - 1 
                      ? 'border-gray-300 bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                      : 'border-transparent bg-primary-600 text-white hover:bg-primary-700'
                  } shadow-sm text-sm font-medium rounded-md`}
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">
                No questions available.
              </p>
            </div>
          )}
        </main>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 sm:mx-0 sm:h-10 sm:w-10">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Submit Assessment
                </h3>
                <div className="mt-2">
                  {confirmSubmitError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {confirmSubmitError}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Are you sure you want to submit your assessment? This action cannot be undone.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeAssessment;
