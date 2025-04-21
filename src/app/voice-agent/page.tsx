'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, MicrophoneIcon, PhoneXMarkIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Vapi from '@vapi-ai/web';
import jsPDF from 'jspdf';

// Define types for VAPI events and messages
interface VapiFunctionCall {
  name: string;
  arguments?: Record<string, unknown>;
}

interface VapiFunctionCallEvent {
  functionCall: VapiFunctionCall;
  messages?: Array<{
    role: string;
    content: string;
    name?: string;
  }>;
  conversationHistory?: Array<{
    role: string;
    content: string;
    name?: string;
  }>;
}

// SYSTEM_PROMPT for Voice Agent (Instructs calling requestPdfSummary function)
const SYSTEM_PROMPT = "You are BridgeCare, an assistant at a doctor's office. You are friendly and professional, but not overly chummy. You should respond politely but not overly drawn out, kind of curt, and politely decline to answer anything that's not related to this specific user and their illness. You begin the user by asking about their symptoms. Then, if relevant, you ask the user about their medical history. Conversation with the user should flow naturally. In the end, if the user is out of symptoms to report (you should sense when this point happens), you *verbally* list helpful things to ask a proper physician afterward. After listing them, you ask the user ONLY ONCE if they want a PDF summary containing their symptoms, your recommendations, and the questions list. \n\n**CRITICAL FUNCTION CALL INSTRUCTION:** If, and *only* if, the user explicitly agrees to generate the PDF (e.g., says 'yes', 'okay', 'please do'), your *only action* MUST be to call the function named `requestPdfSummary`. Do NOT generate text content for the PDF yourself. Do NOT have any other conversational response in that turn. Just make the function call. After making the call, you can then say something like 'Okay, I'm preparing the PDF summary now. Please check the screen for the download button.' If the user declines or says anything else, just acknowledge politely (e.g., 'Okay, no problem.') and end the conversation or wait for further input. Do NOT call the function if the user does not clearly agree.\n\nYou're super nice and helpful and have the personality of a vibrant young woman in their early 20s / late teens. You only answer medical questions, literally only medical questions, anything else you politely decline to answer.";

// Your VAPI API key
const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;

export default function VoiceAgent() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [isMuted, setIsMuted] = useState(false);
  const [pdfSummaryContent, setPdfSummaryContent] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  
  // PDF Generation Function (copied from text-agent)
  const generatePdf = () => {
    if (!pdfSummaryContent) return;
    setIsGeneratingPdf(true);
    setStatus('Generating PDF...'); // Update status

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      let currentY = 20;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      const titleFontSize = 18;
      const headingFontSize = 14;
      const textFontSize = 10;
      const lightBlueColor = '#60a5fa';
      const lightGrayColor = '#cccccc';

      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(lightBlueColor);
      doc.text('BridgeCare - Consultation Summary', pageWidth / 2, currentY, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      currentY += lineHeight * 3;

      const lines = pdfSummaryContent.split('\n');
      doc.setFont('helvetica', 'normal');
      let isFirstSection = true;

      lines.forEach(line => {
        let potentialHeight = 0;
        const trimmedLine = line.trim();

        try {
             if (trimmedLine.startsWith('### ')) {
                 potentialHeight = lineHeight * 1.5 + 2 + lineHeight * 2;
             } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                 // @ts-expect-error: jsPDF type issue with getTextDimensions
                 potentialHeight = doc.getTextDimensions('•  ' + trimmedLine.substring(2), { fontSize: textFontSize, maxWidth: contentWidth - 5 }).h;
             } else if (trimmedLine !== '') {
                 // @ts-expect-error: jsPDF type issue with getTextDimensions
                 potentialHeight = doc.getTextDimensions(trimmedLine, { fontSize: textFontSize, maxWidth: contentWidth }).h;
             }
             potentialHeight += lineHeight * 0.5;
        } catch(e) { 
            console.warn("jsPDF getTextDimensions error (ignorable?):", e);
            potentialHeight = lineHeight * 3; // Estimate height if calculation fails
        } 
        
        if (currentY + potentialHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          isFirstSection = false;
        }

        if (isFirstSection && !trimmedLine.startsWith('### ') && trimmedLine !== '') {
          doc.setFontSize(textFontSize);
          doc.setFont('helvetica', 'normal');
          const splitText = doc.splitTextToSize(trimmedLine, contentWidth);
          doc.text(splitText, margin, currentY);
          try { // Wrap dimension calculation in try-catch
              // @ts-expect-error: jsPDF type issue with getTextDimensions
              const summaryDimensions = doc.getTextDimensions(trimmedLine, { fontSize: textFontSize, maxWidth: contentWidth });
              currentY += summaryDimensions.h + lineHeight;
          } catch(e) {
              console.warn("jsPDF getTextDimensions error (ignorable?):", e);
              currentY += splitText.length * lineHeight + lineHeight; // Estimate based on split lines
          }
          isFirstSection = false;
        } else if (trimmedLine.startsWith('### ')) {
          currentY += lineHeight * 2;
          doc.setFontSize(headingFontSize);
          doc.setFont('helvetica', 'bold');
          doc.text(trimmedLine.substring(4), margin, currentY);
          try { // Wrap dimension calculation in try-catch
              // @ts-expect-error: jsPDF type issue with getTextDimensions
              const headingTextHeight = doc.getTextDimensions(trimmedLine.substring(4), { fontSize: headingFontSize }).h;
              currentY += headingTextHeight * 0.8;
          } catch(e) {
               console.warn("jsPDF getTextDimensions error (ignorable?):", e);
              currentY += lineHeight * 0.8; // Estimate
          }
          doc.setDrawColor(lightGrayColor);
          doc.setLineWidth(0.2);
          doc.line(margin, currentY, margin + contentWidth, currentY);
          currentY += lineHeight;

        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          doc.setFontSize(textFontSize);
          doc.setFont('helvetica', 'normal');
          const itemText = '•  ' + trimmedLine.substring(2);
          const splitItemText = doc.splitTextToSize(itemText, contentWidth - 5);
          doc.text(splitItemText, margin + 5, currentY);
          try { // Wrap dimension calculation in try-catch
              // @ts-expect-error: jsPDF type issue with getTextDimensions
              const dimensions = doc.getTextDimensions(itemText, { fontSize: textFontSize, maxWidth: contentWidth - 5 });
              currentY += dimensions.h + (lineHeight * 0.3);
          } catch(e) {
              console.warn("jsPDF getTextDimensions error (ignorable?):", e);
              currentY += splitItemText.length * lineHeight + (lineHeight * 0.3); // Estimate
          }
        } else if (trimmedLine === '') {
            // ignore
        } 
      });

      doc.save('bridgecare-consultation-summary.pdf');
      setPdfSummaryContent(null); 
      setStatus('PDF downloaded. Call ended.'); // Update status after successful save

    } catch (error) {
      console.error('Error generating PDF:', error);
      setStatus('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Initialize Vapi and set up event handlers
  useEffect(() => {
    if (!VAPI_API_KEY) {
      console.error('VAPI_API_KEY is not set in environment variables');
      setStatus('Error: API key not set');
      return;
    }

    try {
      vapiRef.current = new Vapi(VAPI_API_KEY);
      
      vapiRef.current.on('call-start', () => {
        console.log('Call started');
        setStatus('Call active');
        setIsActive(true);
        setIsMuted(false);
        setPdfSummaryContent(null);
        setIsGeneratingPdf(false);
      });
      
      vapiRef.current.on('call-end', () => {
        console.log('Call ended');
        if (!pdfSummaryContent && !isGeneratingPdf) {
           setStatus('Call ended. Press the button to start again.');
        } else if (!isGeneratingPdf) {
            setStatus('Call ended. Download your summary below.');
        }
        setIsActive(false);
        setIsMuted(false);
      });
      
      // Add explicit type check for error message
      vapiRef.current.on('error', (error: unknown) => {
        console.error('VAPI call error inside .on("error"):', error);
         let errorMessage = 'An error occurred during the call.';
         // Check for Vapi specific structure first
         if (typeof error === 'object' && error !== null && 'errorMsg' in error && typeof error.errorMsg === 'string') {
             errorMessage = `Error: ${error.errorMsg}`;
         } else if (error instanceof Error) {
           errorMessage = `Error: ${error.message}`;
         } else if (typeof error === 'string') {
             errorMessage = `Error: ${error}`;
         } else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
             errorMessage = `Error: ${error.message}`;
         }
         setStatus(errorMessage);
         setIsActive(false);
         setIsMuted(false);
         setPdfSummaryContent(null);
         setIsGeneratingPdf(false);
      });
      
      vapiRef.current.on('speech-start', () => {
        if(isActive) setStatus('Assistant speaking');
      });
      
      vapiRef.current.on('speech-end', () => {
        if (isActive && !isMuted && !isGeneratingPdf && !pdfSummaryContent) {
             setStatus('Listening');
        }
      });
      
      // Handle Function Calls - use type assertion for the event name
      // @ts-expect-error: VAPI types issue - function-call event might not be in type definitions
      vapiRef.current.on('function-call', async (payload: unknown) => {
        console.log('Function call received:', payload);
        // Type guard for payload structure
        if (
            payload && 
            typeof payload === 'object' && 
            'functionCall' in payload && 
            typeof payload.functionCall === 'object' && 
            payload.functionCall !== null && 
            'name' in payload.functionCall && 
            typeof payload.functionCall.name === 'string' && 
            payload.functionCall.name === 'requestPdfSummary'
        ) {
            const typedPayload = payload as VapiFunctionCallEvent;
            
            setStatus('Generating PDF summary...');
            setIsGeneratingPdf(true);
            setPdfSummaryContent(null);

            try {
              // Type guard for messages/history
              let conversationHistory: Array<{role: string; content: string; name?: string}> = [];
              if ('messages' in typedPayload && Array.isArray(typedPayload.messages)) {
                  conversationHistory = typedPayload.messages;
              } else if ('conversationHistory' in typedPayload && Array.isArray(typedPayload.conversationHistory)) {
                  conversationHistory = typedPayload.conversationHistory;
              }

              if (conversationHistory.length === 0) {
                  console.warn('Could not extract conversation history from function call payload or it was empty.', payload);
                  throw new Error('Could not extract conversation history from function call payload.');
              }

              type BackendMessage = { role: string; content: string };

              const pdfRequestMessages: BackendMessage[] = [
                  ...conversationHistory.map((msg): BackendMessage => ({
                      role: String(msg.role || 'user'), 
                      content: String(msg.content || '') 
                  })),
                  {
                      role: 'user',
                      content: 'SYSTEM_TASK: Generate the PDF summary content based on our conversation, following the specific format instructions (start with PDF_SUMMARY:: marker, include summary paragraph, then Symptoms, Recommendations, and Questions sections).'
                  }
              ];

              const response = await fetch('/api/openai', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ messages: pdfRequestMessages }),
              });

              if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || `Backend API Error: ${response.statusText}`);
              }

              const data = await response.json();
              const aiResponse = data.message.content || '';

              if (aiResponse.startsWith('PDF_SUMMARY::')) {
                  const summary = aiResponse.substring('PDF_SUMMARY::'.length).trim();
                  setPdfSummaryContent(summary);
                  setStatus('PDF summary ready for download.');
                  // Send confirmation message back to VAPI
                  vapiRef.current?.send({ 
                    type: 'say',
                    message: 'I have successfully generated the PDF summary. You can now download it using the button on screen.' 
                  });
              } else {
                  console.error('Backend response missing PDF_SUMMARY:: marker:', aiResponse);
                  throw new Error('Backend did not return the expected PDF summary format.');
              }
            } catch (error) {
                console.error('Error processing function call:', error);
                setStatus(`Error preparing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setPdfSummaryContent(null);
                // Send error message back to VAPI
                vapiRef.current?.send({ 
                  type: 'say',
                  message: 'I encountered an error while generating the PDF summary. Please try again later.' 
                });
            } finally {
                setIsGeneratingPdf(false);
            }
        } else {
            console.warn("Received function-call event but payload structure or name did not match expected 'requestPdfSummary' structure.", payload);
        }
      });
      
    } catch (error) {
      console.error('Error initializing VAPI:', error);
      setStatus('Error initializing voice assistant');
    }

    // Clean up on unmount
    return () => {
      try {
        if (vapiRef.current) {
          // Vapi `stop()` returns void
          vapiRef.current.stop(); 
        } 
      } catch (error) {
        console.error('Error stopping VAPI on unmount:', error);
      }
    };
    // We intentionally exclude isActive, isMuted, isGeneratingPdf, and pdfSummaryContent
    // dependencies to prevent re-initialization of VAPI on every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Function to start the call
  const startCall = async () => {
    if (!vapiRef.current || isActive) return;
    setPdfSummaryContent(null);
    setIsGeneratingPdf(false);
    setStatus('Wait while we start the call...');
    try {
      // Use type assertion for the VAPI start method
      await vapiRef.current.start({
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: SYSTEM_PROMPT }],
          functions: [
              {
                  name: "requestPdfSummary",
                  description: "Triggers the generation of a PDF summary on the client application.", 
                  parameters: {
                      type: "object",
                      properties: {} 
                  }
              }
          ]
        },
        voice: {
          provider: "playht", 
          voiceId: "jennifer"
        },
        firstMessage: "Welcome to the doctor's office at Sciences <phoneme alphabet=\"ipa\" ph=\"paʊ\">Po</phoneme>! How may I assist you today?"
      } as Record<string, unknown>); // Type assertion with more specific type
    } catch (error) {
       console.error('Error starting call:', error);
       let errorMessage = 'Failed to start call.';
       if (error instanceof Response) {
         try {
           const errorData = await error.json();
           errorMessage = `Error: ${errorData?.error?.message || error.statusText || 'Unknown API error'}`;
         } catch {
           errorMessage = `Error: Status ${error.status} - ${error.statusText}`;
         }
       } else if (error instanceof Error) {
         errorMessage = `Error: ${error.message}`;
       }
      setStatus(errorMessage);
      setIsActive(false);
    }
  };

  const endCall = async () => {
    if (!vapiRef.current || !isActive) return;
    setStatus('Ending call...');
    try {
      // No await needed if stop is synchronous
      vapiRef.current.stop(); 
    } catch (error) {
       console.error('Error stopping call:', error);
       setStatus('Error trying to end call');
    }
  };

  const toggleMute = () => {
    if (!vapiRef.current || !isActive) return;
    const newMutedState = !isMuted;
    vapiRef.current.setMuted(newMutedState); 
    setIsMuted(newMutedState);
    setStatus(newMutedState ? 'Microphone Muted' : 'Listening');
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */} 
      <header className="flex items-center p-4 border-b border-sky-100">
        <Link href="/dashboard" className="p-2 rounded-full hover:bg-sky-50">
          <ArrowLeftIcon className="w-6 h-6 text-sky-600" />
        </Link>
        <div className="ml-4 flex items-baseline">
          <h1 className="text-2xl font-semibold text-sky-600">BridgeCare</h1>
          <span className="ml-2 text-lg font-medium text-sky-900">- Voice Consultation</span>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <p className="text-lg font-medium text-sky-900">Medical Voice Assistant</p>
          <p className={`text-sm mt-2 ${status.toLowerCase().includes('error') ? 'text-red-600' : status === 'PDF summary ready for download.' || status === 'PDF downloaded. Call ended.' ? 'text-green-600' : 'text-gray-500'}`}>
            {status}
          </p>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          {/* Start Call Button */} 
          {!isActive && !pdfSummaryContent && (
            <button
              onClick={startCall}
              className={`bg-sky-500 hover:bg-sky-600 text-white rounded-full p-6 shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={'Start voice assistant'}
              disabled={status === 'Wait while we start the call...'}
            >
              <MicrophoneIcon className="w-12 h-12" />
            </button>
          )}

          {/* Active Call Controls */} 
          {isActive && (
            <div className="flex items-center space-x-6">
              {/* Mute/Unmute Button */}
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors shadow-md ${isMuted ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? (
                  <SpeakerXMarkIcon className="w-8 h-8" />
                ) : (
                  <SpeakerWaveIcon className="w-8 h-8" />
                )}
              </button>

              {/* End Call Button */} 
              <button
                onClick={endCall}
                className={`bg-red-500 hover:bg-red-600 text-white rounded-full p-4 transition-colors shadow-md`}
                aria-label={'End call'}
              >
                <PhoneXMarkIcon className="w-8 h-8" />
              </button>
            </div>
          )}

          {/* PDF Download Button (shown when PDF ready/generating, even after call ends) */} 
           {(pdfSummaryContent || isGeneratingPdf) && (
                <div className="mt-4">
                    <button
                        onClick={generatePdf}
                        disabled={isGeneratingPdf || !pdfSummaryContent}
                        className="flex items-center justify-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                        {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Summary'}
                    </button>
                </div>
            )}
        </div>
        
        {/* Helper Text */} 
        <p className="mt-8 text-center text-gray-600 max-w-md">
          {isActive 
            ? (status === 'Listening' ? "The assistant is listening. Speak clearly." : status === 'Microphone Muted' ? "Your microphone is muted." : status === 'Assistant speaking' ? "Please wait while the assistant responds." : "Call in progress...")
            : pdfSummaryContent 
              ? "Your summary is ready. Click the button above to download." 
              : isGeneratingPdf 
                ? "Preparing your PDF summary, please wait..."
                : status === 'Ready' || status.startsWith('Call ended') 
                  ? "Press the microphone button to start a voice consultation."
                  : status.startsWith('Error')
                    ? "Please check your connection or API keys and try again."
                    : "Preparing the voice assistant..."} 
        </p>
      </div>
    </div>
  );
} 