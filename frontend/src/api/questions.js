import axios from 'axios';

// Get questions with optional filtering
export const getQuestions = async (filters = {}) => {
  const response = await axios.get('/api/questions', { params: filters });
  return response.data;
};

// Get single question by ID
export const getQuestion = async (id) => {
  const response = await axios.get(`/api/questions/${id}`);
  return response.data;
};

// Create new question
export const createQuestion = async (questionData) => {
  const response = await axios.post('/api/questions', questionData);
  return response.data;
};

// Update question
export const updateQuestion = async (id, questionData) => {
  const response = await axios.put(`/api/questions/${id}`, questionData);
  return response.data;
};

// Delete question
export const deleteQuestion = async (id) => {
  const response = await axios.delete(`/api/questions/${id}`);
  return response.data;
};

// Import questions in bulk
export const importQuestions = async (questionsData) => {
  const response = await axios.post('/api/questions/import', questionsData);
  return response.data;
};

// Export questions
export const exportQuestions = async (filters = {}) => {
  const response = await axios.get('/api/questions/export', { 
    params: filters,
    responseType: 'blob'
  });
  return response.data;
};
