import { OpenAI } from 'openai';
// Import the specific type for messages
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// // Use the imported type instead of a custom one
// type ChatMessage = {
//   role: 'user' | 'system' | 'assistant' | 'function' | 'tool';
//   content: string;
//   name?: string;
// }

/**
 * Generates a response from OpenAI based on the provided messages
 * @param messages Array of messages conforming to OpenAI's type
 * @returns The content of the assistant's response
 */
export async function generateOpenAIResponse(messages: ChatCompletionMessageParam[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  // Log that we're sending a request to OpenAI
  console.log(`Sending ${messages.length} messages to OpenAI`);
  
  try {
    // Make the API call to OpenAI - No need for `as any` now
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',  // Using a capable model, can be configured as needed
      messages: messages, 
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Extract the response content
    const responseContent = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    // Return the response content
    return responseContent;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error; // Re-throw to let the API route handler deal with it
  }
} 