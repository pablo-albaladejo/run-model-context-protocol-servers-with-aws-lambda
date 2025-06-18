import { Paperclip, Send, Smile } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message here...",
}) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage("");
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  return (
    <div className="flex items-end space-x-3 p-4 border-t border-gray-200 bg-white">
      {/* Attachment button */}
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "p-2 text-gray-400 hover:text-gray-600 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title="Attach file"
      >
        <Paperclip className="h-5 w-5" />
      </button>

      {/* Emoji button */}
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "p-2 text-gray-400 hover:text-gray-600 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title="Add emoji"
      >
        <Smile className="h-5 w-5" />
      </button>

      {/* Message input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "input-field resize-none min-h-[44px] max-h-[120px] pr-12",
            "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          )}
          rows={1}
        />

        {/* Character count */}
        {isTyping && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {message.length}/1000
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className={cn(
          "btn-primary p-3 rounded-full",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200",
          message.trim() && !disabled && "hover:scale-105"
        )}
        title="Send message"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ChatInput;
