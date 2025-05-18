import axios from 'axios';

// Start proctoring session
export const startProctorSession = async (attemptId, assessmentId, settings) => {
  const response = await axios.post('/api/proctor/sessions', {
    attemptId,
    assessmentId,
    settings
  });
  return response.data;
};

// End proctoring session
export const endProctorSession = async (sessionId) => {
  const response = await axios.post(`/api/proctor/sessions/${sessionId}/end`);
  return response.data;
};

// Record proctoring event
export const recordProctorEvent = async (eventData) => {
  const response = await axios.post('/api/proctor/events', eventData);
  return response.data;
};

// Get session events (for review)
export const getSessionEvents = async (sessionId) => {
  const response = await axios.get(`/api/proctor/sessions/${sessionId}/events`);
  return response.data;
};

// WebRTC signaling
export const sendSignal = async (sessionId, signal, targetUserId) => {
  const response = await axios.post('/api/proctor/signal', {
    sessionId,
    signal,
    targetUserId
  });
  return response.data;
};

// Get lockdown browser configuration
export const getLockdownConfig = async (sessionId) => {
  const response = await axios.get(`/api/proctor/lockdown/${sessionId}`);
  return response.data;
};
