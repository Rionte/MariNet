// Gemini API Client

// Default API key - this should be replaced by user's key
let API_KEY = 'AIzaSyA6G79HI5EwMl1xPBaqoZldk1qQIzfr-68';
let CUSTOM_INSTRUCTIONS = '';

// Store API key in localStorage
export const setGeminiApiKey = (key: string) => {
  API_KEY = key;
  localStorage.setItem('gemini_api_key', key);
};

export const getGeminiApiKey = (): string => {
  return localStorage.getItem('gemini_api_key') || API_KEY;
};

// Store custom instructions in localStorage
export const setCustomInstructions = (instructions: string) => {
  CUSTOM_INSTRUCTIONS = instructions;
  localStorage.setItem('gemini_custom_instructions', instructions);
};

export const getCustomInstructions = (): string => {
  return localStorage.getItem('gemini_custom_instructions') || CUSTOM_INSTRUCTIONS;
};

// Initialize on load
const initGemini = () => {
  const storedApiKey = localStorage.getItem('gemini_api_key');
  if (storedApiKey) {
    API_KEY = storedApiKey;
  }
  
  const storedInstructions = localStorage.getItem('gemini_custom_instructions');
  if (storedInstructions) {
    CUSTOM_INSTRUCTIONS = storedInstructions;
  }
};

initGemini();

// Message interface
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

// Interface for fetch response
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Function to generate a chat completion
export const generateChatCompletion = async (
  messages: ChatMessage[]
): Promise<ChatMessage> => {
  try {
    // Format messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // Add custom instructions if available
    const customInstr = getCustomInstructions();
    if (customInstr && customInstr.trim() !== '') {
      formattedMessages.unshift({
        role: 'user',
        parts: [{ text: `Custom instructions: ${customInstr}` }]
      });
      
      // Add a system response to acknowledge the instructions
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: "I'll follow these instructions in our conversation." }]
      });
    }

    // Make API request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getGeminiApiKey()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: formattedMessages,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate response');
    }

    const data = await response.json() as GeminiResponse;
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const generatedText = data.candidates[0]?.content?.parts[0]?.text || 'No response';

    return {
      role: 'model',
      content: generatedText,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating chat completion:', error);
    return {
      role: 'model',
      content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`,
      timestamp: new Date().toISOString(),
    };
  }
};

// Function to check if API key is valid
export const validateApiKey = async (key: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Hello' }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 10,
          },
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}; 