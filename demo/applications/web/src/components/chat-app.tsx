// import { logger } from '@demo/shared'
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useWebSocket } from "../hooks/use-websocket";
import ChatInput from "./chat-input";
import MessageBubble from "./message-bubble";

interface Message {
  id: string;
  timestamp: string;
  message: string;
  sender: "user" | "assistant";
}

interface WebSocketMessage {
  type: string;
  connectionId?: string;
  sessionId?: string;
  message?: {
    timestamp: string;
    message: string;
    sender: "user" | "assistant";
  };
  error?: string;
}

const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case "connected":
        // Connection established, no action needed
        break;

      case "message_sent":
        if (data.message) {
          addMessage({
            id: Date.now().toString(),
            timestamp: data.message.timestamp,
            message: data.message.message,
            sender: data.message.sender,
          });
        }
        break;

      case "message_received":
        if (data.message) {
          addMessage({
            id: Date.now().toString(),
            timestamp: data.message.timestamp,
            message: data.message.message,
            sender: data.message.sender,
          });
          setIsLoading(false);
        }
        break;

      case "error":
        setError(data.error || "An error occurred");
        setIsLoading(false);
        break;

      default:
        console.warn("Unknown WebSocket message type", { type: data.type });
    }
  };

  const {
    isConnected,
    error: wsError,
    sendMessage: sendWsMessage,
  } = useWebSocket({
    url: WS_URL,
    onMessage: handleWebSocketMessage,
    onError: () => setError("WebSocket connection error"),
  });

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const initializeChat = async () => {
    try {
      setError(null);

      // Create a new session
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const sessionData = await response.json();
      setSessionId(sessionData.sessionId);

      // Load chat history
      await loadChatHistory(sessionData.sessionId);
    } catch (error) {
      console.error("Error initializing chat", { error });
      setError("Failed to initialize chat. Please refresh the page.");
    }
  };

  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/messages/${sessionId}?limit=50`
      );

      if (!response.ok) {
        throw new Error("Failed to load chat history");
      }

      const data = await response.json();
      const historyMessages: Message[] = data.messages.map(
        (msg: any, index: number) => ({
          id: `${sessionId}-${index}`,
          timestamp: msg.timestamp,
          message: msg.message,
          sender: msg.sender,
        })
      );

      setMessages(historyMessages);
    } catch (error) {
      console.error("Error loading chat history", { error });
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!sessionId || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Send via WebSocket if connected
      if (isConnected) {
        const sent = sendWsMessage({
          type: "message",
          sessionId,
          message: messageText,
        });

        if (!sent) {
          throw new Error("Failed to send via WebSocket");
        }
      } else {
        // Fallback to REST API
        const response = await fetch(`${API_BASE_URL}/api/chat/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            message: messageText,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        // Add user message
        addMessage({
          id: Date.now().toString(),
          timestamp: data.userMessage.timestamp,
          message: data.userMessage.message,
          sender: "user",
        });

        // Add assistant message
        addMessage({
          id: (Date.now() + 1).toString(),
          timestamp: data.assistantMessage.timestamp,
          message: data.assistantMessage.message,
          sender: "assistant",
        });

        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error sending message", { error });
      setError("Failed to send message. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    initializeChat();
  };

  useEffect(() => {
    initializeChat();
  }, []);

  // Update error state when WebSocket error changes
  useEffect(() => {
    if (wsError) {
      setError(wsError);
    }
  }, [wsError]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">AI Chat</h2>
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">Disconnected</span>
                </div>
              )}
            </div>

            {/* Retry button */}
            {error && (
              <button
                onClick={handleRetry}
                className="btn-secondary flex items-center space-x-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <Wifi className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <p className="text-lg font-medium mb-2">Start a conversation!</p>
              <p className="text-sm mb-4">Try asking about:</p>
              <ul className="space-y-1 text-sm">
                <li>• "What's the weather like in New York?"</li>
                <li>• "What time is it in Tokyo?"</li>
                <li>• "Show me weather alerts for California"</li>
              </ul>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.message}
                timestamp={message.timestamp}
                sender={message.sender}
              />
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="message-bubble message-assistant">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSendMessage={sendMessage}
          disabled={!isConnected && !sessionId}
          placeholder={
            !isConnected ? "Connecting..." : "Type your message here..."
          }
        />
      </div>
    </div>
  );
};

export default ChatApp;
