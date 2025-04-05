import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage, generateChatCompletion, getCustomInstructions, setCustomInstructions } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import toast from 'react-hot-toast';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customInstructionsState, setCustomInstructionsState] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load messages and custom instructions from localStorage on component mount
  useEffect(() => {
    // Load custom instructions
    try {
      const savedInstructions = getCustomInstructions();
      if (savedInstructions) {
        setCustomInstructionsState(savedInstructions);
      }
    } catch (e) {
      console.error('Failed to load custom instructions:', e);
    }
    
    // Load chat messages
    const savedMessages = localStorage.getItem('ai_chat_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
      }
    } else {
      // Set welcome message if no saved messages
      const welcomeMessage: ChatMessage = {
        role: 'model',
        content: "# Welcome to MariNet AI Tutor! 👋\n\nI'm your AI tutor powered by Google Gemini. I can help you with:\n\n- Answering academic questions\n- Explaining concepts\n- Solving problems\n- Providing study tips\n\nHow can I assist you today?",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, []);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  }, [messages, isLoading]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Send all messages to maintain context
      const response = await generateChatCompletion([...messages, userMessage]);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'model',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveCustomInstructions = () => {
    try {
      setCustomInstructions(customInstructionsState);
      setShowSettings(false);
      
      // Add a system message acknowledging the update
      const systemMessage: ChatMessage = {
        role: 'model',
        content: "✓ Custom instructions updated. I'll follow these guidelines in our conversation.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, systemMessage]);
      
      toast.success('Custom instructions saved');
    } catch (error) {
      console.error('Error saving custom instructions:', error);
      toast.error('Failed to save custom instructions');
    }
  };
  
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      const welcomeMessage: ChatMessage = {
        role: 'model',
        content: "# Chat Cleared\n\nI'm your AI tutor powered by Google Gemini. How can I help you today?",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      localStorage.removeItem('ai_chat_messages');
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-white/20 rounded-full">
            <Bot className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold">AI Tutor</h2>
          <Sparkles className="h-4 w-4 text-yellow-300" />
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button 
            onClick={clearChat}
            className="text-sm px-3 py-1 bg-white/20 rounded-md hover:bg-white/30 transition-colors"
            aria-label="Clear chat"
          >
            Clear Chat
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="p-6 bg-white border-b border-gray-200 shadow-sm relative z-10">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Custom Instructions</h3>
          <p className="text-sm text-gray-600 mb-4">These instructions will guide how the AI responds to your questions.</p>
          <div className="relative">
            <textarea 
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 bg-gray-50"
              rows={4}
              placeholder="E.g., Act as a math tutor who explains concepts clearly and provides step-by-step solutions."
              value={customInstructionsState}
              onChange={(e) => setCustomInstructionsState(e.target.value)}
            />
            <div className="absolute bottom-4 right-2 text-xs text-gray-400">
              {customInstructionsState.length} characters
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => setShowSettings(false)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={saveCustomInstructions}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors shadow-sm flex items-center"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Save Instructions
            </button>
          </div>
        </div>
      )}
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl p-4 shadow-sm
              ${message.role === 'user' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none' 
                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
              }
            `}>
              <div className="flex items-center mb-2 space-x-2">
                <span className={`p-1.5 rounded-full ${message.role === 'user' ? 'bg-blue-500' : 'bg-blue-100'} flex items-center justify-center`}>
                  {message.role === 'user' 
                    ? <User className="h-4 w-4 text-white" /> 
                    : <Bot className="h-4 w-4 text-blue-600" />
                  }
                </span>
                <span className="font-medium text-sm">
                  {message.role === 'user' ? 'You' : 'AI Tutor'}
                </span>
                <span className="text-xs opacity-70">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              
              <div className={`prose ${message.role === 'user' ? 'prose-invert' : ''} max-w-none text-sm`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none max-w-[85%] p-4 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-sm font-medium">AI Tutor is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full p-4 pr-10 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500 flex items-center justify-center">
          <Sparkles className="h-3 w-3 mr-1 text-blue-500" />
          <span>Powered by Google Gemini</span>
        </div>
      </form>
    </div>
  );
};

export default AIChat; 