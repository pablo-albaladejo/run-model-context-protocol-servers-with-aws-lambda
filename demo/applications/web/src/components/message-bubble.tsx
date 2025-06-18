import React from "react";
import { cn } from "../utils/cn";

interface MessageBubbleProps {
  message: string;
  timestamp: string;
  sender: "user" | "assistant";
  isTyping?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  timestamp,
  sender,
  isTyping = false,
}) => {
  const isUser = sender === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "message-bubble",
          isUser ? "message-user" : "message-assistant",
          "animate-slide-up"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message}</p>
        <p
          className={cn(
            "text-xs mt-1",
            isUser ? "text-blue-100" : "text-gray-500"
          )}
        >
          {new Date(timestamp).toLocaleTimeString()}
        </p>
        {isTyping && (
          <div className="flex items-center space-x-1 mt-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
