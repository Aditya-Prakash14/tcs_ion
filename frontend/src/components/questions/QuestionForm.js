import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { createQuestion, updateQuestion } from '../../api/questions';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const QuestionForm = ({ isOpen, onClose, question = null }) => {
  const queryClient = useQueryClient();
  const isEditing = !!question;
  const [formData, setFormData] = useState({
    type: 'multiple-choice',
    content: {
      text: '',
      image: '',
      code: ''
    },
    options: [
      { id: '1', text: '', isCorrect: false },
      { id: '2', text: '', isCorrect: false }
    ],
    correctAnswer: null,
    difficulty: 'medium',
    tags: [],
    points: 1,
    timeEstimate: 60
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form if editing an existing question
  useEffect(() => {
    if (question) {
      setFormData({
        ...question,
        content: question.content || { text: '', image: '', code: '' },
        options: question.options && question.options.length > 0 
          ? question.options 
          : [
              { id: '1', text: '', isCorrect: false },
              { id: '2', text: '', isCorrect: false }
            ],
        tags: question.tags || []
      });
    }
  }, [question]);

  // Mutation for creating/updating a question
  const mutation = useMutation(
    (data) => isEditing ? updateQuestion(question._id, data) : createQuestion(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('questions');
        onClose();
      },
      onError: (error) => {
        console.error('Question save error:', error);
        setErrors({ 
          form: error.response?.data?.message || 'Failed to save question. Please try again.' 
        });
        setIsSubmitting(false);
      }
    }
  );
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear related errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handle option changes
  const handleOptionChange = (index, field, value) => {
    setFormData(prev => {
      const options = [...prev.options];
      options[index] = { ...options[index], [field]: value };
      
      // For true-false questions, make sure only one option is correct
      if (field === 'isCorrect' && value === true && prev.type === 'single-choice') {
        options.forEach((option, i) => {
          if (i !== index) {
            options[i] = { ...option, isCorrect: false };
          }
        });
      }
      
      return { ...prev, options };
    });
    
    // Clear related errors
    if (errors.options) {
      setErrors(prev => ({ ...prev, options: null }));
    }
  };

  // Add option
  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        { id: String(prev.options.length + 1), text: '', isCorrect: false }
      ]
    }));
  };

  // Remove option
  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      setErrors({
        ...errors,
        options: 'Questions must have at least 2 options'
      });
      return;
    }
    
    setFormData(prev => {
      const options = prev.options.filter((_, i) => i !== index).map((opt, i) => ({
        ...opt,
        id: String(i + 1)
      }));
      return { ...prev, options };
    });
  };

  // Handle tag input
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    const newTag = tagInput.trim();
    if (formData.tags.includes(newTag)) {
      setErrors({
        ...errors,
        tags: 'Tag already exists'
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag]
    }));
    setTagInput('');
    
    // Clear related errors
    if (errors.tags) {
      setErrors(prev => ({ ...prev, tags: null }));
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle tag input keypress (add tag on Enter)
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Validate content
    if (!formData.content.text && !formData.content.code) {
      newErrors.content = 'Question must have text or code content';
    }
    
    // Validate options
    if (['multiple-choice', 'single-choice', 'true-false'].includes(formData.type)) {
      const emptyOptions = formData.options.some(opt => !opt.text.trim());
      if (emptyOptions) {
        newErrors.options = 'All options must have text';
      }
      
      const hasCorrectOption = formData.options.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        newErrors.correctOption = 'At least one option must be marked as correct';
      }
    }
    
    // Validate fill-in-the-blank or essay questions
    if (['fill-in-the-blank', 'essay'].includes(formData.type) && !formData.correctAnswer) {
      newErrors.correctAnswer = 'Answer key is required';
    }
    
    // Validate points
    if (formData.points < 1) {
      newErrors.points = 'Points must be at least 1';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting) return;
    
    setIsSubmitting(true);
    mutation.mutate(formData);
  };
  
  // Dynamic form fields based on question type
  const renderQuestionTypeFields = () => {
    switch (formData.type) {
      case 'multiple-choice':
      case 'single-choice':
        return (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
              {formData.type === 'single-choice' && 
                <span className="text-xs text-gray-500 ml-2">(select one correct answer)</span>
              }
              {formData.type === 'multiple-choice' && 
                <span className="text-xs text-gray-500 ml-2">(select one or more correct answers)</span>
              }
            </label>
            
            {errors.options && (
              <p className="text-red-500 text-sm mt-1 mb-2">{errors.options}</p>
            )}
            
            {errors.correctOption && (
              <p className="text-red-500 text-sm mt-1 mb-2">{errors.correctOption}</p>
            )}
            
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <input
                    type={formData.type === 'multiple-choice' ? 'checkbox' : 'radio'}
                    name={`option-correct-${formData.type}`}
                    checked={option.isCorrect}
                    onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm w-full"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={addOption}
              className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Option
            </button>
          </div>
        );
      
      case 'true-false':
        return (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              True/False Answer
            </label>
            
            {errors.correctOption && (
              <p className="text-red-500 text-sm mt-1 mb-2">{errors.correctOption}</p>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="true-false-answer"
                  checked={formData.options[0]?.isCorrect || false}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      options: [
                        { id: '1', text: 'True', isCorrect: true },
                        { id: '2', text: 'False', isCorrect: false }
                      ]
                    }));
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600"
                />
                <span className="text-gray-700 dark:text-gray-300">True</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="true-false-answer"
                  checked={formData.options[1]?.isCorrect || false}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      options: [
                        { id: '1', text: 'True', isCorrect: false },
                        { id: '2', text: 'False', isCorrect: true }
                      ]
                    }));
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600"
                />
                <span className="text-gray-700 dark:text-gray-300">False</span>
              </div>
            </div>
          </div>
        );
      
      case 'fill-in-the-blank':
        return (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correct Answer
            </label>
            
            {errors.correctAnswer && (
              <p className="text-red-500 text-sm mt-1 mb-2">{errors.correctAnswer}</p>
            )}
            
            <input
              type="text"
              name="correctAnswer"
              value={formData.correctAnswer || ''}
              onChange={handleChange}
              placeholder="Enter correct answer"
              className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              For multiple accepted answers, separate them with commas.
            </p>
          </div>
        );
      
      case 'essay':
        return (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Answer Guidelines/Rubric
            </label>
            
            {errors.correctAnswer && (
              <p className="text-red-500 text-sm mt-1 mb-2">{errors.correctAnswer}</p>
            )}
            
            <textarea
              name="correctAnswer"
              value={formData.correctAnswer || ''}
              onChange={handleChange}
              placeholder="Enter answer guidelines or rubric for grading"
              rows="4"
              className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            ></textarea>
          </div>
        );
      
      case 'coding':
        return (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expected Output or Test Cases
            </label>
            
            {errors.correctAnswer && (
              <p className="text-red-500 text-sm mt-1 mb-2">{errors.correctAnswer}</p>
            )}
            
            <textarea
              name="correctAnswer"
              value={formData.correctAnswer || ''}
              onChange={handleChange}
              placeholder="Enter expected output or test cases for automatic grading"
              rows="4"
              className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            ></textarea>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {isEditing ? 'Edit Question' : 'Add New Question'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-110px)]">
          {errors.form && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-red-600 dark:text-red-400">{errors.form}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Question Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Question Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="multiple-choice">Multiple Choice</option>
                <option value="single-choice">Single Choice</option>
                <option value="true-false">True/False</option>
                <option value="fill-in-the-blank">Fill in the Blank</option>
                <option value="essay">Essay</option>
                <option value="coding">Coding</option>
              </select>
            </div>
            
            {/* Question Content */}
            <div>
              <label htmlFor="content.text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Question Text
              </label>
              
              {errors.content && (
                <p className="text-red-500 text-sm mt-1 mb-2">{errors.content}</p>
              )}
              
              <textarea
                id="content.text"
                name="content.text"
                value={formData.content.text}
                onChange={handleChange}
                rows="3"
                placeholder="Enter question text"
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              ></textarea>
            </div>
            
            {/* Code Snippet (if applicable) */}
            <div>
              <label htmlFor="content.code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Code Snippet (optional)
              </label>
              <textarea
                id="content.code"
                name="content.code"
                value={formData.content.code}
                onChange={handleChange}
                rows="4"
                placeholder="Enter code snippet if applicable"
                className="font-mono mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              ></textarea>
            </div>
            
            {/* Image URL (if applicable) */}
            <div>
              <label htmlFor="content.image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Image URL (optional)
              </label>
              <input
                type="text"
                id="content.image"
                name="content.image"
                value={formData.content.image || ''}
                onChange={handleChange}
                placeholder="Enter image URL"
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>
            
            {/* Dynamic fields based on question type */}
            {renderQuestionTypeFields()}
            
            {/* Question Metadata */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label htmlFor="points" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Points
                </label>
                
                {errors.points && (
                  <p className="text-red-500 text-sm mt-1 mb-2">{errors.points}</p>
                )}
                
                <input
                  type="number"
                  id="points"
                  name="points"
                  min="1"
                  value={formData.points}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                />
              </div>
              <div>
                <label htmlFor="timeEstimate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Time Estimate (seconds)
                </label>
                <input
                  type="number"
                  id="timeEstimate"
                  name="timeEstimate"
                  min="0"
                  value={formData.timeEstimate}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                />
              </div>
            </div>
            
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              
              {errors.tags && (
                <p className="text-red-500 text-sm mt-1 mb-2">{errors.tags}</p>
              )}
              
              <div className="flex items-center">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Add a tag"
                  className="focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 block shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="ml-2 inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm leading-4 font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                >
                  Add
                </button>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
                Saving...
              </>
            ) : isEditing ? 'Update Question' : 'Create Question'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;
