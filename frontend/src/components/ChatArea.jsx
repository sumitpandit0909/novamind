import React, { useRef, useEffect, useState } from 'react';
import Message from './Message';

const thinkingPhases = [
  'Analyzing your question...',
  'Searching knowledge base...',
  'Retrieving relevant context...',
  'Generating response...'
];

export default function ChatArea({
  messages,
  isDocumentIndexed,
  onSendMessage,
  onClearChat,
  botStatus,
  isTyping
}) {
  const [inputText, setInputText] = useState('');
  const chatMessagesRef = useRef(null);
  const textareaRef = useRef(null);
  const [thinkingPhase, setThinkingPhase] = useState(0);

  // Rotate through thinking phases while typing
  useEffect(() => {
    if (!isTyping) {
      setThinkingPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingPhase(prev => (prev + 1) % thinkingPhases.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isTyping]);

  // Auto-scroll to bottom of chat history when messages or typing status changes
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Handle textarea autosize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight - 4}px`;
    }
  }, [inputText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || (!isDocumentIndexed && !isTyping)) return;

    onSendMessage(text);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <main className="chat-container">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="active-chat-info">
          <div className="bot-avatar-header">
            <img src="/logo.png" alt="Assistant Avatar" />
          </div>
          <div>
            <h2>NovaMind</h2>
            <span className="bot-status">
              {botStatus}
            </span>
          </div>
        </div>
        <div className="chat-actions">
          <button className="action-btn" onClick={onClearChat} title="Clear Chat History">
            <i className="fa-solid fa-trash-can"></i> Clear Chat
          </button>
        </div>
      </header>

      {/* Message Area */}
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((msg, index) => (
          <Message
            key={index}
            sender={msg.sender}
            text={msg.text}
          />
        ))}

        {/* Thinking Animation (shown while waiting for initial response) */}
        {isTyping && (
          <div className="message bot-message thinking-message">
            <div className="msg-avatar">
              <img src="/logo.png" alt="Bot Avatar" />
            </div>
            <div className="message-content thinking-content">
              <div className="thinking-indicator">
                <span className="thinking-dot"></span>
                <span className="thinking-dot"></span>
                <span className="thinking-dot"></span>
              </div>
              <span className="thinking-text">{thinkingPhases[thinkingPhase]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form Area */}
      <div className="chat-input-wrapper">
        <form onSubmit={handleSubmit} className="chat-input-container">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your indexed documents..."
            rows={1}
            disabled={!isDocumentIndexed && !isTyping}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!inputText.trim() || (!isDocumentIndexed && !isTyping)}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
        <div className="input-info">
          Press Enter to send. Shift + Enter for new line.
        </div>
      </div>
    </main>
  );
}