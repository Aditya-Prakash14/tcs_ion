import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Webcam from 'react-webcam';
import { startProctorSession, recordProctorEvent, getLockdownConfig } from '../api/proctor';

const ExamLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const webcamRef = useRef(null);
  
  const [proctorSession, setProctorSession] = useState(null);
  const [proctorConfig, setProctorConfig] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [tabFocused, setTabFocused] = useState(true);
  
  // Extract attempt and assessment IDs from URL or state
  const getIds = () => {
    const params = new URLSearchParams(location.search);
    return {
      attemptId: params.get('attemptId') || location.state?.attemptId,
      assessmentId: params.get('assessmentId') || location.state?.assessmentId
    };
  };

  // Initialize proctoring session
  useEffect(() => {
    const initProctoring = async () => {
      try {
        const { attemptId, assessmentId } = getIds();
        
        if (!attemptId || !assessmentId) {
          console.error('Missing attempt or assessment ID');
          navigate('/assessments');
          return;
        }

        // Start proctor session
        const session = await startProctorSession(attemptId, assessmentId, {
          webcam: {
            required: true,
            enabled: false
          },
          screenSharing: {
            required: false,
            enabled: false
          },
          fullScreenRequired: true,
          browserLockdown: true
        });

        setProctorSession(session);

        // Get lockdown configuration
        const config = await getLockdownConfig(session.sessionId);
        setProctorConfig(config);

        // Ask for webcam permission if required
        if (config.fullScreenRequired) {
          requestFullScreen();
        }
      } catch (error) {
        console.error('Failed to initialize proctoring:', error);
      }
    };

    initProctoring();

    // Set up tab visibility change detection
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setTabFocused(isVisible);
      
      if (!isVisible && proctorSession) {
        recordProctorEvent({
          sessionId: proctorSession.sessionId,
          type: 'tab-switch',
          severity: 'high',
          details: {
            time: new Date().toISOString(),
          }
        }).catch(error => {
          console.error('Failed to record tab switch event:', error);
        });
      }
    };

    // Set up full screen change detection
    const handleFullScreenChange = () => {
      const isInFullScreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      
      setIsFullScreen(isInFullScreen);
      
      if (!isInFullScreen && proctorSession && proctorConfig?.fullScreenRequired) {
        recordProctorEvent({
          sessionId: proctorSession.sessionId,
          type: 'full-screen-exit',
          severity: 'high',
          details: {
            time: new Date().toISOString(),
          }
        }).catch(error => {
          console.error('Failed to record full screen exit event:', error);
        });
        
        // Remind user to return to full screen
        setTimeout(() => {
          if (!document.fullscreenElement) {
            alert('Please return to full screen mode to continue with the assessment.');
            requestFullScreen();
          }
        }, 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
    };
  }, [navigate, location.search, location.state]);

  // Request full screen mode
  const requestFullScreen = () => {
    const element = document.documentElement;
    
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(e => console.error('Could not enter fullscreen mode:', e));
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    }
  };

  // Enable webcam
  const enableWebcam = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamEnabled(true);
      
      // Update proctor session
      if (proctorSession) {
        proctorSession.settings.webcam.enabled = true;
      }
    } catch (error) {
      console.error('Failed to enable webcam:', error);
      alert('Please enable webcam to continue with the assessment.');
    }
  };

  // Face detection (very basic implementation - in real app, use a proper face detection library)
  useEffect(() => {
    if (!webcamEnabled || !webcamRef.current || !proctorSession) return;
    
    const checkFace = setInterval(() => {
      // In a real app, this would use face-api.js or similar to detect faces
      // For now, we just check if the webcam is still active
      const videoElement = webcamRef.current.video;
      if (!videoElement || videoElement.readyState !== 4) {
        recordProctorEvent({
          sessionId: proctorSession.sessionId,
          type: 'face-not-detected',
          severity: 'medium',
          details: {
            time: new Date().toISOString(),
          }
        }).catch(error => {
          console.error('Failed to record face not detected event:', error);
        });
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkFace);
  }, [webcamEnabled, proctorSession]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Exam Mode
            </h1>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                isFullScreen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isFullScreen ? 'Fullscreen' : 'Not Fullscreen'}
              </span>
              
              <span className={`px-2 py-1 text-xs rounded-full ${
                tabFocused ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {tabFocused ? 'Tab Focused' : 'Tab Not Focused'}
              </span>
              
              <span className={`px-2 py-1 text-xs rounded-full ${
                webcamEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {webcamEnabled ? 'Webcam On' : 'Webcam Off'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Proctor instructions */}
      {proctorConfig && !webcamEnabled && proctorConfig.webcamRequired && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                This assessment requires webcam access for proctoring.
                <button 
                  onClick={enableWebcam}
                  className="ml-2 font-medium text-yellow-700 underline hover:text-yellow-600"
                >
                  Enable Webcam
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow flex">
        <div className="flex-grow py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </div>
        
        {/* Webcam feed */}
        {webcamEnabled && (
          <div className="w-64 h-48 fixed right-4 bottom-4 bg-black rounded-md overflow-hidden z-50">
            <Webcam 
              ref={webcamRef}
              audio={false}
              width={256}
              height={192}
              mirrored={true}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamLayout;
