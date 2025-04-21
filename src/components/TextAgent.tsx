import React, { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import ChatMessages from './ChatMessages';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const TextAgent: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      setFiles(prevFiles => [...prevFiles, ...fileArray]);
    }
  };
  
  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files);
      setFiles(prevFiles => [...prevFiles, ...fileArray]);
    }
  };
  
  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  // Clear all files
  const clearFiles = () => {
    setFiles([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() && files.length === 0) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    
    // Add user message to the chat
    const newMessages: Message[] = [
      ...messages,
      { role: 'user' as const, content: userMessage + (files.length > 0 
        ? `\n\n[Attached ${files.length} file${files.length > 1 ? 's' : ''}: ${files.map(f => f.name).join(', ')}]` 
        : '') }
    ];
    setMessages(newMessages);
    
    try {
      // Create form data to handle files
      const formData = new FormData();
      
      // Add messages to form data
      formData.append('messages', JSON.stringify(newMessages));
      
      // Add files to form data
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Clear files after adding them to the form
      clearFiles();
      
      // Send the request
      const response = await fetch('/api/mistral', {
        method: 'POST',
        body: formData,
        headers: {},
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        { role: 'assistant' as const, content: data.message.content }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        <ChatMessages messages={messages} />
      </div>
      
      <div className="mt-4">
        {files.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md mb-2">
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div 
                  key={index} 
                  className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded flex items-center gap-2"
                >
                  <span className="text-sm truncate max-w-[120px]">{file.name}</span>
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div 
            className={`border rounded-md p-2 flex ${isDragging ? 'bg-gray-100 dark:bg-gray-800 border-blue-400' : 'bg-white dark:bg-gray-900'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow bg-transparent outline-none"
              disabled={isLoading}
            />
            
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <label
              htmlFor="file-upload"
              className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </label>
            
            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && files.length === 0)}
              className="ml-2 p-2 text-white bg-blue-500 rounded-md disabled:opacity-50"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TextAgent; 