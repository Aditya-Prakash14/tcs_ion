import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { XMarkIcon, ArrowDownTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

const ImportExportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);
  const queryClient = useQueryClient();

  // Import mutation
  const importMutation = useMutation(onImport, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('questions');
      setImportResults(data);
      setIsUploading(false);
      setFile(null);
    },
    onError: (error) => {
      console.error('Import error:', error);
      setError(error.response?.data?.message || 'Failed to import questions. Please check your file format.');
      setIsUploading(false);
    }
  });

  // Validate file
  const validateFile = useCallback((selectedFile) => {
    if (!selectedFile) return false;
    
    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit');
      return false;
    }
    
    // Get file extension
    const fileName = selectedFile.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);
    
    // Validate file type using both MIME type and extension
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['csv', 'xls', 'xlsx'];
    
    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
      setError('Please upload a valid CSV or Excel file');
      return false;
    }
    
    return true;
  }, []);
  
  // Handle file change from input
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setError('');
      setImportResults(null);
    } else {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if we're leaving the drop area (not its children)
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    // Get the dropped files
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length === 0) return;
    
    // We only accept one file, so take the first one
    const selectedFile = droppedFiles[0];
    
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setError('');
      setImportResults(null);
    }
  };
  
  // Handle clicking the drop area
  const handleDropAreaClick = () => {
    // Trigger the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle import
  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      
      await importMutation.mutate(formData);
    } catch (error) {
      console.error('Import error:', error);
      setError(error.message || 'Failed to import questions');
      setIsUploading(false);
    }
  };

  // Handle download template
  const handleDownloadTemplate = () => {
    // Create CSV template
    const template = 'type,content.text,content.code,options,correctAnswer,difficulty,tags,points,timeEstimate\n' +
      'multiple-choice,"What is 2+2?","","[{\\"id\\":\\"1\\",\\"text\\":\\"3\\",\\"isCorrect\\":false},{\\"id\\":\\"2\\",\\"text\\":\\"4\\",\\"isCorrect\\":true}]","",medium,"math,arithmetic",1,30\n' +
      'single-choice,"Which is a color?","","[{\\"id\\":\\"1\\",\\"text\\":\\"Apple\\",\\"isCorrect\\":false},{\\"id\\":\\"2\\",\\"text\\":\\"Blue\\",\\"isCorrect\\":true}]","",easy,"general,colors",1,20\n' +
      'true-false,"The sky is blue.","","[{\\"id\\":\\"1\\",\\"text\\":\\"True\\",\\"isCorrect\\":true},{\\"id\\":\\"2\\",\\"text\\":\\"False\\",\\"isCorrect\\":false}]","",easy,"general",1,15\n' +
      'fill-in-the-blank,"The capital of France is _____.","","","Paris",medium,"geography,countries",1,30\n' +
      'essay,"Explain the water cycle.","","","The water cycle involves evaporation, condensation, precipitation.",hard,"science,environment",5,300\n' +
      'coding,"Write a function to add two numbers.","function add(a, b) {\n  // Your code here\n}","","function add(a, b) {\n  return a + b;\n}",medium,"programming,javascript",3,180';
    
    // Create blob and download
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'question-import-template.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Import Questions
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {importResults && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
              <p className="text-green-600 dark:text-green-400">
                Successfully imported {importResults.imported} questions.
                {importResults.failed > 0 && ` (${importResults.failed} failed)`}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Questions File
              </label>
              
              <div 
                ref={dropAreaRef}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${
                  isDragActive 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : isUploading
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-300 dark:border-gray-600 border-dashed'
                } rounded-md transition-colors duration-200 ${isUploading ? 'cursor-wait' : 'cursor-pointer'}`}
                onClick={isUploading ? undefined : handleDropAreaClick}
                onDragEnter={isUploading ? undefined : handleDragEnter}
                onDragOver={isUploading ? undefined : handleDragOver}
                onDragLeave={isUploading ? undefined : handleDragLeave}
                onDrop={isUploading ? undefined : handleDrop}
              >
                <div className="space-y-3 text-center">
                  {isDragActive ? (
                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-primary-500 dark:text-primary-400 animate-pulse" />
                  ) : (
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <div className="flex justify-center text-sm text-gray-600 dark:text-gray-400">
                    <span className={`${isDragActive ? 'text-primary-600 dark:text-primary-400 font-medium' : ''}`}>
                      {isDragActive ? 'Drop file here' : 'Drag and drop your file here'}
                    </span>
                    <span className="mx-1">{!isDragActive && 'or'}</span>
                    {!isDragActive && (
                      <span 
                        className="relative cursor-pointer font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus-within:outline-none"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleDropAreaClick();
                          }
                        }}
                      >
                        browse
                      </span>
                    )}
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    CSV or Excel file up to 10MB
                  </p>
                </div>
              </div>
              
              {file && (
                <div className="mt-3 flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <DocumentArrowUpIcon className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="ml-2 flex-shrink-0 p-1 rounded-full text-green-500 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800 focus:outline-none"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download Template
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Import Format:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>CSV or Excel file with appropriate headers</li>
                <li>Each row represents a question</li>
                <li>Options should be in valid JSON format</li>
                <li>Tags should be comma-separated</li>
              </ul>
            </div>
          </div>
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
            onClick={handleImport}
            disabled={!file || isUploading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 ${
              (!file || isUploading) ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <>
                <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
                Importing...
              </>
            ) : 'Import Questions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportExportModal;
