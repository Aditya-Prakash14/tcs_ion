import axios from 'axios';

// Get all assessments with optional filtering
export const getAssessments = async (filters = {}) => {
  const response = await axios.get('/api/assessments', { params: filters });
  return response.data;
};

// Get single assessment by ID
export const getAssessment = async (id) => {
  const response = await axios.get(`/api/assessments/${id}`);
  return response.data;
};

// Create new assessment
export const createAssessment = async (assessmentData) => {
  const response = await axios.post('/api/assessments', assessmentData);
  return response.data;
};

// Update assessment
export const updateAssessment = async (id, assessmentData) => {
  const response = await axios.put(`/api/assessments/${id}`, assessmentData);
  return response.data;
};

// Delete assessment
export const deleteAssessment = async (id) => {
  const response = await axios.delete(`/api/assessments/${id}`);
  return response.data;
};

// Start assessment attempt
export const startAssessment = async (id) => {
  const response = await axios.post(`/api/assessments/${id}/attempt`);
  return response.data;
};

// Submit answer during assessment
export const submitAnswer = async (attemptId, questionId, answer) => {
  const response = await axios.post(`/api/attempts/${attemptId}/answers`, {
    questionId,
    answer
  });
  return response.data;
};

// Finish assessment attempt
export const finishAssessment = async (attemptId) => {
  const response = await axios.post(`/api/attempts/${attemptId}/submit`);
  return response.data;
};

// Get attempt results
export const getAssessmentResults = async (attemptId) => {
  const response = await axios.get(`/api/attempts/${attemptId}/results`);
  return response.data;
};

// Record a proctoring event
export const recordProctorEvent = async (attemptId, eventData) => {
  const response = await axios.post(`/api/attempts/${attemptId}/proctoring`, eventData);
  return response.data;
};
