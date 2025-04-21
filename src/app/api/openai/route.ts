import { NextRequest, NextResponse } from 'next/server';
import { generateOpenAIResponse } from '@/lib/openai';
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  console.log('-----------------------------------');
  console.log('OpenAI API route called');
  console.log('Environment OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  
  if (process.env.OPENAI_API_KEY) {
    console.log('API key length:', process.env.OPENAI_API_KEY.length);
  }
  
  console.log('-----------------------------------');
  
  try {
    let body;
    try {
      body = await request.json();
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse request body as JSON:', parseError);
      return NextResponse.json({ error: 'Invalid request format. Expected JSON body.' }, { status: 400 });
    }
    
    const messages = body.messages;
    console.log('Messages received:', messages ? `[${messages.length} messages]` : 'None');
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid request: messages are missing, not an array, or empty');
      return NextResponse.json({ error: 'Invalid messages format: ' + (!messages ? 'Missing' : !Array.isArray(messages) ? 'Not an array' : 'Empty') }, { status: 400 });
    }
    
    if (!messages.every(m => typeof m === 'object' && m !== null && 'role' in m && 'content' in m)) {
      console.error('Invalid message structure within the array');
      return NextResponse.json({ error: 'Invalid message structure in array' }, { status: 400 });
    }
    
    console.log('Calling OpenAI helper function...');
    
    try {
      const responseContent = await generateOpenAIResponse(messages);
      
      console.log('OpenAI API responded successfully');
      console.log('Response preview:', typeof responseContent === 'string' ? responseContent.slice(0, 100) + '...' : '[Non-string response]');
      
      return NextResponse.json({ message: { content: responseContent } });
    } catch (error) {
      console.error('Error occurred during OpenAI API call:', error);
      
      let errorMessage = 'An unknown error occurred while contacting the AI service';
      let statusCode = 500;
      
      if (error instanceof OpenAI.APIError) {
        console.error(`OpenAI API Error: Status ${error.status}, Type: ${error.error?.type}, Message: ${error.message}`);
        statusCode = error.status || 500;
        errorMessage = `AI Service Error: ${error.message}`;
        
        if (statusCode === 401) errorMessage = 'AI Authentication Error: Invalid API Key.';
        if (statusCode === 429) errorMessage = 'AI Service Error: Rate limit exceeded.';
        if (statusCode >= 500) errorMessage = 'AI Service Error: Server issue. Please try again later.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('OPENAI_API_KEY is not set')) {
          statusCode = 500;
          errorMessage = 'Server configuration error prevented AI call.';
        }
      }
      
      return NextResponse.json({
        error: errorMessage,
        message: { 
          content: "I'm having trouble processing your request right now. Please try again in a moment." 
        }
      }, { status: statusCode });
    }
  } catch (error) {
    console.error('Unexpected error in API route handler:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected internal server error occurred.',
        message: { 
          content: "I'm sorry, something went wrong. Please try again or contact support if the issue persists." 
        } 
      }, 
      { status: 500 }
    );
  }
} 