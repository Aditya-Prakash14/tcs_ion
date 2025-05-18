import React, { useState } from 'react';
import { PencilIcon, TrashIcon, EyeIcon, TagIcon } from '@heroicons/react/24/outline';

const QuestionCard = ({ question, onEdit, onDelete, onTagClick }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Format the question content for display
  const getQuestionContent = () => {
    if (!question.content) return 'No content available';
    
    let displayContent = question.content.text || '';
    if (question.content.code) {
      displayContent += question.content.code;
    }
    
    // Truncate content if it's too long and not in preview mode
    if (!isPreviewOpen && displayContent.length > 150) {
      return displayContent.substring(0, 150) + '...';
    }
    
    return displayContent;
  };

  // Format difficulty with appropriate badge color
  const getDifficultyBadge = () => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    switch(question.difficulty) {
      case 'easy':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'hard':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  // Format question type with appropriate badge color
  const getTypeBadge = () => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    switch(question.type) {
      case 'multiple-choice':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'single-choice':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
      case 'true-false':
        return `${baseClasses} bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300`;
      case 'fill-in-the-blank':
        return `${baseClasses} bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300`;
      case 'essay':
        return `${baseClasses} bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300`;
      case 'coding':
        return `${baseClasses} bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  // Format question type for display
  const formatQuestionType = (type) => {
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
      {/* Question header with badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={getTypeBadge()}>
          {formatQuestionType(question.type)}
        </span>
        <span className={getDifficultyBadge()}>
          {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
        </span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {question.points} {question.points === 1 ? 'point' : 'points'}
        </span>
      </div>
      
      {/* Question content */}
      <div className="mb-3">
        <p className={`text-gray-900 dark:text-gray-100 whitespace-pre-wrap ${isPreviewOpen ? '' : 'line-clamp-3'}`}>
          {getQuestionContent()}
        </p>
        {question.content && question.content.text && question.content.text.length > 150 && (
          <button 
            onClick={() => setIsPreviewOpen(!isPreviewOpen)} 
            className="text-primary-600 hover:text-primary-500 dark:text-primary-400 text-sm font-medium mt-1 focus:outline-none"
          >
            {isPreviewOpen ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      
      {/* Options preview for multiple/single choice */}
      {['multiple-choice', 'single-choice', 'true-false'].includes(question.type) && question.options && question.options.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Options:</p>
          <div className="space-y-1">
            {question.options.slice(0, isPreviewOpen ? question.options.length : 2).map((option, index) => (
              <div 
                key={option.id || index} 
                className="flex items-start gap-2 text-sm"
              >
                <span className={`w-4 h-4 mt-0.5 rounded-full flex items-center justify-center ${
                  option.isCorrect 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {index + 1}
                </span>
                <span className={`flex-1 ${option.isCorrect ? 'font-medium' : ''} text-gray-700 dark:text-gray-300`}>
                  {option.text}
                </span>
              </div>
            ))}
            {!isPreviewOpen && question.options.length > 2 && (
              <button 
                onClick={() => setIsPreviewOpen(true)} 
                className="text-primary-600 hover:text-primary-500 dark:text-primary-400 text-sm font-medium mt-1 focus:outline-none"
              >
                Show all {question.options.length} options
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {question.tags.slice(0, isPreviewOpen ? question.tags.length : 3).map(tag => (
              <span 
                key={tag} 
                onClick={() => onTagClick(tag)}
                className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-xs text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {!isPreviewOpen && question.tags.length > 3 && (
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="text-primary-600 hover:text-primary-500 dark:text-primary-400 text-xs font-medium focus:outline-none"
              >
                +{question.tags.length - 3} more
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex items-center justify-end space-x-3 mt-2">
        <button 
          onClick={() => setIsPreviewOpen(!isPreviewOpen)}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <EyeIcon className="h-5 w-5" />
        </button>
        <button 
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        <button 
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default QuestionCard;
