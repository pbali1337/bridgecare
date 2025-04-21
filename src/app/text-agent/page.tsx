'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeftIcon, PaperAirplaneIcon, PaperClipIcon, DocumentTextIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import jsPDF from 'jspdf';

// Initial system prompt
const SYSTEM_PROMPT = "You are BridgeCare, an assistant at a doctor's office. You are friendly and professional, but not overly chummy. You should respond politely but not overly drawn out, kind of curt, and politely decline to answer anything that's not related to this specific user and their illness. You begin the user by asking about their symptoms. Then, if relevant, you ask the user about their medical history. Conversation with the user should flow naturally. In the end, if the user is out of symptoms to report (you should sense when this point happens), you generate a list of helpful things to ask a proper physician afterward, in vertical bullet points *in the chat*. After providing the bullet points, you ask the user ONLY ONCE if they want to generate a PDF summary containing their symptoms, your recommendations, and the questions list. \n\n**IMPORTANT INSTRUCTION:** If the user agrees to generate the PDF, your *entire next response* MUST start *exactly* with the marker `PDF_SUMMARY::` followed immediately by the content for the PDF. Do NOT include any conversational text before or after the marker and the content in that specific response. The content MUST be structured as follows:\n1. A summary paragraph (100-150 words) discussing the conversation, potential causes (if mentioned), relevant history (if mentioned), and overview of recommendations.\n2. A blank line.\n3. The heading `### Symptoms` followed by a concise bulleted list.\n4. A blank line.\n5. The heading `### Recommendations` followed by a concise bulleted list.\n6. A blank line.\n7. The heading `### Questions to Ask` followed by a concise bulleted list.\nExample of PDF agreement response: \n`PDF_SUMMARY::\nThis summary covers the patient's reported symptoms, including [brief symptom recap]. Considering the provided medical history [mention if any, e.g., 'of condition X' or 'none provided'], potential causes might involve [brief mention if applicable]. Key recommendations include [brief overview]. The following questions are suggested for discussion with a physician.\n\n### Symptoms\n- Symptom 1\n- Symptom 2\n### Recommendations\n- Recommendation 1\n- Recommendation 2\n### Questions to Ask\n- Question 1\n- Question 2`\n\nIf the user declines the PDF, just acknowledge politely and end the conversation.\n\nYou're super nice and helpful and have the personality of a vibrant young woman in their early 20s / late teens. You only answer medical questions, literally only medical questions, anything else you politely decline to answer.";

export default function TextAgent() {
  const [messages, setMessages] = useState<{ role: 'system' | 'user' | 'assistant'; content: string; attachments?: string[] }[]>([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'assistant', content: 'Welcome to the doctor\'s office at Sciences Po! How may I assist you today? 😊' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<string[]>([]);
  const [pdfSummaryContent, setPdfSummaryContent] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generatePdf = () => {
    if (!pdfSummaryContent) return;
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      let currentY = 20; // Start Y position
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      const titleFontSize = 18;
      const headingFontSize = 14;
      const textFontSize = 10;
      const lightBlueColor = '#60a5fa'; // Tailwind blue-400 hex
      const lightGrayColor = '#cccccc'; // For the divider line

      // --- Title ---
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(lightBlueColor); // Set color for title
      doc.text('BridgeCare - Consultation Summary', pageWidth / 2, currentY, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Reset text color to black
      currentY += lineHeight * 3; // Increased space after title

      // --- Parse and add content ---
      const lines = pdfSummaryContent.split('\n'); // Keep blank lines initially for structure
      doc.setFont('helvetica', 'normal');
      let isFirstSection = true; // Flag to handle summary paragraph

      lines.forEach(line => {
        // Correctly calculate potential height for page break check
        let potentialHeight = 0;
        const trimmedLine = line.trim(); // Trim line here for reuse

        if (trimmedLine.startsWith('### ')) {
            potentialHeight = lineHeight * 1.5 + 2 + lineHeight * 2; // Heading + space before + line + space after
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            // Corrected call to getTextDimensions for list item
            // @ts-expect-error: jsPDF type issue with getTextDimensions
            potentialHeight = doc.getTextDimensions('•  ' + trimmedLine.substring(2), { fontSize: textFontSize, maxWidth: contentWidth - 5 }).h;
        } else if (trimmedLine !== '') { 
             // Corrected call to getTextDimensions for paragraph/summary
            // @ts-expect-error: jsPDF type issue with getTextDimensions
            potentialHeight = doc.getTextDimensions(trimmedLine, { fontSize: textFontSize, maxWidth: contentWidth }).h;
        }
        // Add a buffer for potential spacing after items
        potentialHeight += lineHeight * 0.5; 
        
        if (currentY + potentialHeight > pageHeight - margin) { 
          doc.addPage();
          currentY = margin;
          isFirstSection = false; // Don't repeat summary on new page
        }

        // --- Add content based on type ---
        if (isFirstSection && !trimmedLine.startsWith('### ') && trimmedLine !== '') {
          // Summary Paragraph
          doc.setFontSize(textFontSize);
          doc.setFont('helvetica', 'normal');
          const splitText = doc.splitTextToSize(trimmedLine, contentWidth);
          doc.text(splitText, margin, currentY);
          // Use calculated height for Y increment
          // @ts-expect-error: jsPDF type issue with getTextDimensions
          const summaryDimensions = doc.getTextDimensions(trimmedLine, { fontSize: textFontSize, maxWidth: contentWidth });
          currentY += summaryDimensions.h + lineHeight; // Use calculated height + space
          isFirstSection = false; // Summary is done after the first block of text
        } else if (trimmedLine.startsWith('### ')) {
          // Heading
          currentY += lineHeight * 2; // Add space *before* the heading
          doc.setFontSize(headingFontSize);
          doc.setFont('helvetica', 'bold');
          doc.text(trimmedLine.substring(4), margin, currentY);
          // Draw the line closer to the text
          // @ts-expect-error: jsPDF type issue with getTextDimensions
          const headingTextHeight = doc.getTextDimensions(trimmedLine.substring(4), { fontSize: headingFontSize }).h;
          currentY += headingTextHeight * 0.8; // Position Y slightly below the text baseline
          // Add thin horizontal line below heading
          doc.setDrawColor(lightGrayColor);
          doc.setLineWidth(0.2);
          doc.line(margin, currentY, margin + contentWidth, currentY);
          currentY += lineHeight; // Space after line

        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          // List item
          doc.setFontSize(textFontSize);
          doc.setFont('helvetica', 'normal');
          const itemText = '•  ' + trimmedLine.substring(2);
          // Correct usage of getTextDimensions with options object
          // @ts-expect-error: jsPDF type issue with getTextDimensions
          const dimensions = doc.getTextDimensions(itemText, { fontSize: textFontSize, maxWidth: contentWidth - 5 });
          const splitItemText = doc.splitTextToSize(itemText, contentWidth - 5); // Indent bullet slightly
          doc.text(splitItemText, margin + 5, currentY);
          currentY += dimensions.h + (lineHeight * 0.3); // Add small spacing after list item
        } else if (trimmedLine === '') {
          // Blank lines used for spacing in the prompt are ignored here
        } 
      });

      // --- Save PDF ---
      doc.save('bridgecare-consultation-summary.pdf');
      setPdfSummaryContent(null); // Clear content after download

    } catch (error) {
      console.error('Error generating PDF:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error generating the PDF.' }]);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const callAIBackend = async (userMessage: string, fileTexts: string[] = []) => {
    try {
      setIsLoading(true);
      
      let messageContent = userMessage;
      if (fileTexts.length > 0) {
        messageContent += "\n\nAttached Documents:\n";
        fileTexts.forEach((text, index) => {
          messageContent += `\n--- Document ${index + 1} ---\n${text}\n`;
        });
      }
      
      const apiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      apiMessages.push({
        role: 'user',
        content: messageContent
      });
      
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response error:', errorData);
        throw new Error(errorData.error || 'Failed to get response from the AI service');
      }

      const data = await response.json();
      return data.message.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('Error calling backend API route:', error);
      
      return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or describe your symptoms in more detail.";
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && fileContents.length === 0) || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setPdfSummaryContent(null);
    
    const attachmentNames = uploadedFiles.map(file => file.name);
    const newUserMessage = { 
      role: 'user' as const, 
      content: userMessage || (attachmentNames.length > 0 ? 'I\'ve attached some documents.' : ''), 
      attachments: attachmentNames.length > 0 ? attachmentNames : undefined
    };
    
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUploadedFiles([]);
    setFileContents([]);
    
    const aiResponse = await callAIBackend(newUserMessage.content, fileContents);
    
    if (aiResponse.startsWith('PDF_SUMMARY::')) {
        const summary = aiResponse.substring('PDF_SUMMARY::'.length).trim();
        setPdfSummaryContent(summary);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Okay, I have prepared the summary. Click the button below to download the PDF.' 
        }]);
    } else {
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: aiResponse 
    }]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const fileArray = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...fileArray]);
    
    const fileTextsPromises = fileArray.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          resolve(text);
        };
        reader.onerror = () => {
          resolve(`[Error reading file: ${file.name}]`);
        };
        reader.readAsText(file);
      });
    });
    
    const newContents = await Promise.all(fileTextsPromises);
    setFileContents(prev => [...prev, ...newContents]);
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center p-4 border-b border-sky-100">
        <Link href="/dashboard" className="p-2 rounded-full hover:bg-sky-50">
          <ArrowLeftIcon className="w-6 h-6 text-sky-600" />
        </Link>
        <div className="ml-4 flex items-baseline">
          <h1 className="text-2xl font-semibold text-sky-600">BridgeCare</h1>
          <span className="ml-2 text-lg font-medium text-sky-900">- Text Consultation</span>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(msg => msg.role !== 'system').map((message, index) => (
          <div 
            key={index} 
            className={`max-w-[80%] p-3 rounded-lg ${
              message.role === 'user' 
                ? 'ml-auto bg-sky-100 text-sky-900' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {message.attachments.map((fileName, idx) => (
                  <div key={idx} className="flex items-center bg-white px-2 py-1 rounded-md text-xs text-gray-600">
                    <DocumentTextIcon className="w-3 h-3 mr-1" />
                    {fileName}
                  </div>
                ))}
              </div>
            )}
            {message.content.split('\n').map((line, i) => (
                <span key={i}>{line}{i < message.content.split('\n').length - 1 && <br />}</span>
            ))}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-center items-center p-2">
            <div className="text-sky-500">
              <span>Thinking</span>
              <span className="inline-flex w-5">
                <span className="animate-[bounce_1s_infinite_0ms] mr-[1px]">.</span>
                <span className="animate-[bounce_1s_infinite_200ms] mr-[1px]">.</span>
                <span className="animate-[bounce_1s_infinite_400ms]">.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-sky-100 flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center bg-sky-50 rounded-full px-3 py-1 text-sm text-sky-700">
              <DocumentTextIcon className="w-4 h-4 mr-1" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button 
                onClick={() => removeFile(index)}
                className="ml-1 text-sky-500 hover:text-sky-700"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="border-t border-sky-100 p-4">
        {pdfSummaryContent && (
            <div className="mb-2 flex justify-center">
                <button
                    onClick={generatePdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center justify-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                    {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Summary'}
                </button>
            </div>
        )}

        <div className="flex items-center bg-gray-50 rounded-xl border border-sky-100 px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            placeholder="Describe your symptoms or reply..."
            className="flex-1 bg-transparent outline-none text-black placeholder-gray-500"
            disabled={isLoading}
          />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            multiple 
            className="hidden" 
            accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          
          <button 
            onClick={triggerFileUpload}
            disabled={isLoading}
            className={`mr-2 p-2 rounded-full ${isLoading ? 'text-gray-300' : 'text-sky-500 hover:bg-sky-50'} transition-colors`}
            title="Attach Files"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || (!input.trim() && fileContents.length === 0)}
            className={`p-2 rounded-full ${isLoading || (!input.trim() && fileContents.length === 0) ? 'bg-gray-300' : 'bg-sky-500 hover:bg-sky-600'} text-white transition-colors`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
        
        {uploadedFiles.length === 0 && !pdfSummaryContent && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            You can attach medical records, test results, or images for analysis
          </p>
        )}
      </div>
    </div>
  );
} 