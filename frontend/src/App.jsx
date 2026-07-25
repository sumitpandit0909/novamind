import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { v4 as uuid4 } from 'uuid';

const SESSIONS_KEY = 'novamind_sessions';
const OLD_SESSIONS_KEY = 'docubot_sessions';
const SESSION_ID_KEY = 'session_id';

function loadSessions() {
  // Migrate old sessions from docubot_sessions to novamind_sessions
  try {
    const oldRaw = localStorage.getItem(OLD_SESSIONS_KEY);
    if (oldRaw) {
      const oldSessions = JSON.parse(oldRaw);
      localStorage.setItem(SESSIONS_KEY, oldRaw);
      localStorage.removeItem(OLD_SESSIONS_KEY);
      // Convert old single-file format to new multi-document format
      return oldSessions.map(s => ({
        ...s,
        documents: s.documents || (s.indexedFileName ? [{ name: s.indexedFileName, size: s.indexedFileSize || 0 }] : [])
      }));
    }
  } catch (e) { /* ignore */ }

  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return [];
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = uuid4();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

function createSessionObj(name) {
  return {
    id: uuid4(),
    name: name || 'New Chat',
    createdAt: Date.now(),
    lastActive: Date.now(),
    isDocumentIndexed: false,
    indexedFileName: '',
    indexedFileSize: 0,
    documents: []
  };
}

export default function App() {
  // ── Session management ──
  const [sessions, setSessions] = useState(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState(() => getOrCreateSessionId());

  // ── Chat messages ──
  const [messages, setMessages] = useState([
    {
      sender: 'system',
      text: '👋 Welcome to <strong>NovaMind</strong>! Upload a PDF or Word document in the sidebar, and I\'ll use it to answer your questions. Ask me anything once the document is indexed!'
    }
  ]);

  // ── Document state (derived from current session) ──
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const [isDocumentIndexed, setIsDocumentIndexed] = useState(currentSession?.isDocumentIndexed || false);
  const [indexedFileName, setIndexedFileName] = useState(currentSession?.indexedFileName || '');
  const [indexedFileSize, setIndexedFileSize] = useState(currentSession?.indexedFileSize || 0);
  const [indexedDocuments, setIndexedDocuments] = useState(currentSession?.documents || []);

  // Upload progress states
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [uploadError, setUploadError] = useState(false);

  // Chat agent states
  const [isTyping, setIsTyping] = useState(false);
  const [botStatus, setBotStatus] = useState('Ready to answer questions');

  // Auth states
  const [email, setEmail] = useState(() => localStorage.getItem("user_email") || "");
  const [userId, setUserId] = useState(() => localStorage.getItem("user_id") || "");
  const [emailInput, setEmailInput] = useState('');
  const [authError, setAuthError] = useState('');

  // ── Ensure current session exists in sessions list ──
  useEffect(() => {
    setSessions(prev => {
      const exists = prev.some(s => s.id === currentSessionId);
      if (!exists) {
        const newSession = createSessionObj('New Chat');
        newSession.id = currentSessionId;
        return [...prev, newSession];
      }
      return prev;
    });
  }, [currentSessionId]);

  // ── Persist sessions on change ──
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // ── Load chat history when switching sessions ──
  useEffect(() => {
    if (!currentSessionId) return;
    localStorage.setItem(SESSION_ID_KEY, currentSessionId);

    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      setIsDocumentIndexed(session.isDocumentIndexed);
      setIndexedFileName(session.indexedFileName);
      setIndexedFileSize(session.indexedFileSize);
      setIndexedDocuments(session.documents || []);
    }

    fetch(`${__API_URL__}/history/${currentSessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.history && data.history.length > 0) {
          const historyMessages = data.history.map(msg => ({
            sender: msg.role === 'user' ? 'user' : 'bot',
            text: msg.content
          }));
          setMessages([
            {
              sender: 'system',
              text: `💬 Resuming chat from session. ${session?.isDocumentIndexed ? `Ready to answer questions about indexed documents.` : 'Upload a document in the sidebar to begin.'}`
            },
            ...historyMessages
          ]);
        } else {
          setMessages([
            {
              sender: 'system',
              text: session?.isDocumentIndexed
                ? `📄 Session active. Ask questions about your indexed documents.`
                : '👋 Welcome to <strong>NovaMind</strong>! Upload a PDF or Word document in the sidebar, and I\'ll use it to answer your questions. Ask me anything once the document is indexed!'
            }
          ]);
        }
      })
      .catch(() => {
        setMessages([
          {
            sender: 'system',
            text: '👋 Welcome to <strong>NovaMind</strong>! Upload a PDF or Word document in the sidebar, and I\'ll use it to answer your questions. Ask me anything once the document is indexed!'
          }
        ]);
      });
  }, [currentSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update session helper ──
  const updateSession = useCallback((sessionId, updates) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
  }, []);

  // ── Auth handlers ──
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) {
      setAuthError('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setAuthError('Please enter a valid email address');
      return;
    }
    const generatedUserId = trimmed.toLowerCase();
    localStorage.setItem("user_email", trimmed);
    localStorage.setItem("user_id", generatedUserId);
    setEmail(trimmed);
    setUserId(generatedUserId);
    setAuthError('');
  };

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_id");
      setEmail('');
      setUserId('');
      setEmailInput('');
      setIsDocumentIndexed(false);
      setIndexedFileName('');
      setIndexedFileSize(0);
      setIndexedDocuments([]);
      setMessages([
        {
          sender: 'system',
          text: '👋 Welcome to <strong>NovaMind</strong>! Upload a PDF or Word document in the sidebar, and I\'ll use it to answer your questions. Ask me anything once the document is indexed!'
        }
      ]);
    }
  };

  // ── New Chat handler ──
  const handleNewChat = () => {
    const newSession = createSessionObj('New Chat');
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    setIsDocumentIndexed(false);
    setIndexedFileName('');
    setIndexedFileSize(0);
    setIndexedDocuments([]);
    setUploadProgress(null);
    setUploadStatusMessage('');
    setUploadError(false);
    setBotStatus('Ready to answer questions');
    setMessages([
      {
        sender: 'system',
        text: '👋 Welcome to <strong>NovaMind</strong>! Upload a PDF or Word document in the sidebar, and I\'ll use it to answer your questions. Ask me anything once the document is indexed!'
      }
    ]);
  };

  // ── Switch session handler ──
  const handleSwitchSession = (sessionId) => {
    if (sessionId === currentSessionId) return;
    setCurrentSessionId(sessionId);
    setUploadProgress(null);
    setUploadStatusMessage('');
    setUploadError(false);
    setIsTyping(false);
  };

  // ── Delete session handler ──
  const handleDeleteSession = (sessionId) => {
    if (sessions.length <= 1) {
      alert('Cannot delete the only session. Create a new one first.');
      return;
    }
    if (!window.confirm('Delete this session and all its history? Documents indexed in this session will remain in the database.')) return;

    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (currentSessionId === sessionId) {
        const next = filtered[0];
        setCurrentSessionId(next.id);
      }
      return filtered;
    });
  };

  // ── Upload handlers ──
  const handleUploadStart = (fileName) => {
    setUploadProgress(0);
    setIndexedFileName(fileName);
    setUploadError(false);
    setUploadStatusMessage('Uploading and indexing document...');
    setBotStatus('Indexing new document...');
  };

  const handleUploadProgress = (percent) => {
    setUploadProgress(percent);
    if (percent >= 80) {
      setUploadStatusMessage('Processing and vectorizing...');
    } else {
      setUploadStatusMessage(`Uploading file... ${percent}%`);
    }
  };

  const handleUploadSuccess = (fileName, fileSize) => {
    setUploadProgress(100);
    setUploadStatusMessage('Successfully indexed!');
    setIsDocumentIndexed(true);
    setIndexedFileName(fileName);
    setIndexedFileSize(fileSize);

    // Add to documents array
    const newDoc = { name: fileName, size: fileSize };
    const updatedDocs = [...(indexedDocuments || []), newDoc];
    setIndexedDocuments(updatedDocs);

    setBotStatus(`Ready: Indexed "${fileName}"`);

    updateSession(currentSessionId, {
      isDocumentIndexed: true,
      indexedFileName: fileName,
      indexedFileSize: fileSize,
      documents: updatedDocs
    });

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId && s.name === 'New Chat') {
        return { ...s, name: fileName, documents: updatedDocs };
      }
      return s;
    }));

    setMessages((prev) => [
      ...prev,
      {
        sender: 'system',
        text: `✅ Document <strong>${fileName}</strong> successfully processed and vectorized in Qdrant database. You can now chat about this file!`
      }
    ]);
  };

  const handleUploadError = (errorMsg) => {
    setUploadProgress(null);
    setUploadError(true);
    setUploadStatusMessage(`Failed: ${errorMsg}`);
    setBotStatus('Ready to answer questions');

    setMessages((prev) => [
      ...prev,
      {
        sender: 'error',
        text: `❌ Failed to process document: ${errorMsg}`
      }
    ]);
  };

  // ── Send message handler ──
  const handleSendMessage = async (text) => {
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setIsTyping(true);

    updateSession(currentSessionId, { lastActive: Date.now() });

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId && s.name === 'New Chat') {
        return { ...s, name: text.length > 40 ? text.slice(0, 40) + '...' : text, lastActive: Date.now() };
      }
      return s;
    }));

    try {
      const response = await fetch(`${__API_URL__}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: text, session_id: currentSessionId })
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP status ${response.status}`);
      }

      setIsTyping(false);
      setMessages((prev) => [...prev, { sender: 'bot', text: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        accumulatedText += chunkText;

        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].sender === 'bot') {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: accumulatedText
            };
          }
          return updated;
        });
      }
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].sender === 'bot' && updated[updated.length - 1].text === '') {
          updated.pop();
        }
        return [
          ...updated,
          { sender: 'error', text: `Connection Error: ${err.message}` }
        ];
      });
    }
  };

  // ── Clear chat handler ──
  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      setMessages([
        {
          sender: 'system',
          text: `💬 Chat history cleared. ${isDocumentIndexed ? `Ready to answer questions about indexed documents.` : 'Upload a document in the sidebar to begin.'}`
        }
      ]);
    }
  };

  // ── Auth screen ──
  if (!email) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-logo-container">
            <i className="fa-solid fa-robot"></i>
          </div>
          <h2>Welcome to NovaMind</h2>
          <p>Please enter your email to access the AI knowledge assistant workspace and sync your indexed files.</p>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="auth-input-group">
              <input
                type="email"
                className="auth-input"
                placeholder="name@company.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                required
              />
              <i className="fa-solid fa-envelope"></i>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            <button type="submit" className="auth-btn">
              Enter Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        userId={userId}
        userEmail={email}
        onSignOut={handleSignOut}
        isDocumentIndexed={isDocumentIndexed}
        indexedFileName={indexedFileName}
        indexedFileSize={indexedFileSize}
        indexedDocuments={indexedDocuments}
        uploadProgress={uploadProgress}
        uploadStatusMessage={uploadStatusMessage}
        uploadError={uploadError}
        onUploadStart={handleUploadStart}
        onUploadProgress={handleUploadProgress}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
      />
      <ChatArea
        messages={messages}
        isDocumentIndexed={isDocumentIndexed}
        onSendMessage={handleSendMessage}
        onClearChat={handleClearChat}
        botStatus={botStatus}
        isTyping={isTyping}
      />
    </div>
  );
}