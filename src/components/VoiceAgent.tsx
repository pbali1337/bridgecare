import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ChatMessages from './ChatMessages';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const VoiceAgent: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [ttsEnabled, setTTSEnabled] = useState(false);

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

  const processAudioWithAI = async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      const userMessage = transcript.trim();
      
      // Add user message to the chat
      const newMessages: Message[] = [
        ...messages,
        { role: 'user' as const, content: userMessage + (files.length > 0 
          ? `\n\n[Attached ${files.length} file${files.length > 1 ? 's' : ''}: ${files.map(f => f.name).join(', ')}]` 
          : '') }
      ];
      setMessages(newMessages);
      
      // Create form data to handle files
      const formData = new FormData();
      
      // Add messages to form data
      formData.append('messages', JSON.stringify(newMessages));
      
      // Add files to form data if any
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
      
      // Speak the response if text-to-speech is enabled
      if (ttsEnabled) {
        speak(data.message.content);
      }
    } catch (error) {
      console.error('Error processing audio with AI:', error);
      toast.error('Failed to process your message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const enableTTS = () => {
    setTTSEnabled(true);
  };

  const toggleSpeaking = () => {
    setTTSEnabled(!ttsEnabled);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim() || files.length > 0) {
      processAudioWithAI(inputText);
      setInputText('');
    }
  };

  const speak = (text: string) => {
    // Implementation of text-to-speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-speech not supported in this browser');
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
        
        <div 
          className={`border rounded-md p-3 flex ${isDragging ? 'bg-gray-100 dark:bg-gray-800 border-blue-400' : 'bg-white dark:bg-gray-900'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak your message..."
            className="flex-grow bg-transparent outline-none"
            disabled={isRecording || isProcessing}
          />
          
          <input
            type="file"
            id="voice-file-upload"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <label
            htmlFor="voice-file-upload"
            className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </label>
          
          <button
            onClick={ttsEnabled ? toggleSpeaking : enableTTS}
            className={`p-2 rounded-full ${ttsEnabled ? 'text-green-500 hover:text-green-600' : 'text-gray-500 hover:text-gray-600'}`}
            disabled={isRecording || isProcessing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.878-2.828" />
            </svg>
          </button>
          
          <button
            onClick={toggleRecording}
            className={`p-2 rounded-full ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-gray-600'}`}
            disabled={isProcessing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && files.length === 0) || isRecording || isProcessing}
            className="ml-2 p-2 text-white bg-blue-500 rounded-md disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent; 