import React from 'react';

// Basic regex-based markdown parser to HTML
const parseMarkdown = (text) => {
  if (!text) return '';
  
  let html = text;
  
  // Escape HTML tags to prevent XSS (but preserve line breaks & markdown)
  html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Code Blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
  html = html.replace(/_([\s\S]*?)_/g, '<em>$1</em>');

  // Split paragraphs by double newline and process lists
  const paragraphs = html.split(/\n\n+/);
  const parsedParagraphs = paragraphs.map((p, pIdx) => {
      p = p.trim();
      if (p.startsWith('&lt;pre&gt;') || p.startsWith('<pre>')) {
          // Keep code blocks un-wrapped by paragraph tags
          return p;
      }
      
      // Check if it is a list
      if (p.includes('\n- ') || p.startsWith('- ')) {
          const items = p.split(/\n- /);
          const listItems = items.map((item, idx) => {
              if (idx === 0 && !item.startsWith('- ')) {
                  // First item might have prefix intro text
                  const subParts = item.split('- ');
                  if (subParts.length > 1) {
                      return `<p>${subParts[0].trim()}</p><ul><li>${subParts[1].trim()}</li>`;
                  }
                  return `<p>${item.trim()}</p><ul>`;
              }
              // Strip the leading dash if it remained
              const cleanItem = item.replace(/^- /, '').trim();
              return `<li>${cleanItem}</li>`;
          });
          return listItems.join('') + '</ul>';
      }
      
      // Standard Paragraph
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  });

  return parsedParagraphs.join('');
};

export default function Message({ sender, text }) {
  if (sender === 'system') {
    return (
      <div className="message system-message">
        <div className="message-content">
          <p dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      </div>
    );
  }

  if (sender === 'error') {
    return (
      <div className="message error-message">
        <div className="message-content">
          <p dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      </div>
    );
  }

  const isUser = sender === 'user';
  const avatarUrl = isUser 
    ? 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=user' 
    : '/logo.png';

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div className="msg-avatar">
        <img src={avatarUrl} alt={`${sender} Avatar`} />
      </div>
      <div className="message-content">
        {isUser ? (
          <p>{text}</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }} />
        )}
      </div>
    </div>
  );
}
