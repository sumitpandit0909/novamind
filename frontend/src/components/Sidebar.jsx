import React, { useRef, useState } from 'react';

export default function Sidebar({
  userId,
  userEmail,
  onSignOut,
  isDocumentIndexed,
  indexedFileName,
  indexedFileSize,
  indexedDocuments,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  uploadProgress,
  uploadStatusMessage,
  uploadError,
  // Session props
  sessions,
  currentSessionId,
  onNewChat,
  onSwitchSession,
  onDeleteSession
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleZoneClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'pdf' || ext === 'docx') {
        uploadFile(file);
      } else {
        alert('Invalid file format. Please upload a PDF or DOCX file.');
      }
    }
  };

  const uploadFile = (file) => {
    onUploadStart(file.name);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    const uploadUrl = `${__API_URL__}/upload?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(currentSessionId)}`;
    xhr.open('POST', uploadUrl, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 80);
        onUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.status === 'success') {
            onUploadSuccess(file.name, file.size);
          } else {
            throw new Error(response.message || 'Indexing failed');
          }
        } catch (err) {
          onUploadError(err.message);
        }
      } else {
        onUploadError(`Server returned status code: ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      onUploadError('Network error occurred during file upload.');
    };

    xhr.send(formData);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatSessionDate = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.id === currentSessionId) return -1;
    if (b.id === currentSessionId) return 1;
    return (b.lastActive || b.createdAt) - (a.lastActive || a.createdAt);
  });

  return (
    <aside className="sidebar">
      <div className="brand-header">
        <img src="/logo.png" alt="NovaMind Logo" className="brand-logo" />
        <div className="brand-info">
          <h1>NovaMind</h1>
          <span class="brand-subtitle">AI Knowledge Assistant</span>
        </div>
      </div>

      <div className="new-chat-container">
        <button className="new-chat-btn" onClick={onNewChat} title="Start a new chat session">
          <i className="fa-solid fa-plus"></i> New Chat
        </button>
      </div>

      <div className="sidebar-content">
        <section className="upload-section">
          <div className="section-header">
            <h2><i className="fa-solid fa-cloud-arrow-up"></i> Index Document</h2>
            <p className="section-desc">Upload a PDF or DOCX file to add it to the AI knowledge base.</p>
          </div>

          <div
            className={`drag-drop-zone ${isDragOver ? 'dragover' : ''}`}
            onClick={handleZoneClick}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx"
              style={{ display: 'none' }}
            />
            <div className="drop-zone-content">
              <i className="fa-solid fa-file-pdf file-icon" id="dropIcon"></i>
              <p className="drop-text">Drag & drop your file here or <span>browse</span></p>
              <p className="file-limits">Supports PDF, DOCX (Max 20MB)</p>
            </div>
          </div>

          {uploadProgress !== null && (
            <div className="progress-container" style={{ display: 'flex' }}>
              <div className="progress-details">
                <span className="file-name">{indexedFileName || "Uploading..."}</span>
                <span className="progress-percentage">
                  {uploadError ? 'Error' : `${uploadProgress}%`}
                </span>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${uploadProgress}%`,
                    background: uploadError ? '#ef4444' : 'linear-gradient(90deg, var(--primary-cyan), var(--accent-indigo))'
                  }}
                ></div>
              </div>
              <div className={`status-msg ${uploadError ? 'error-text' : uploadProgress === 100 ? 'success-text' : ''}`}>
                {uploadStatusMessage}
              </div>
            </div>
          )}
        </section>

        <section className="active-docs-section">
          <div className="section-header">
            <h2><i className="fa-solid fa-database"></i> Knowledge Base</h2>
          </div>
          <div className="docs-status-card">
            <div className="status-indicator-group">
              <span className={`status-dot ${uploadProgress !== null && uploadProgress < 100 && !uploadError ? 'loading' : 'online'}`}></span>
              <span className="status-label">
                {uploadProgress !== null && uploadProgress < 100 && !uploadError ? 'Indexing...' : 'Database Connected'}
              </span>
            </div>
            <div className="active-doc-info">
              {isDocumentIndexed && indexedDocuments && indexedDocuments.length > 0 ? (
                <div className="doc-list">
                  {indexedDocuments.map((doc, idx) => (
                    <div className="doc-badge" key={idx}>
                      <i className={`fa-solid ${doc.name.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-word'}`}></i>
                      <div className="doc-badge-details">
                        <span className="doc-badge-name" title={doc.name}>{doc.name}</span>
                        <span className="doc-badge-size">{formatBytes(doc.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-doc-msg">No document currently indexed. Use the uploader above to start chatting with your file.</p>
              )}
            </div>
          </div>
        </section>

        <section className="session-history-section">
          <div className="section-header">
            <h2><i className="fa-solid fa-clock-rotate-left"></i> Chat History</h2>
          </div>
          <div className="session-list">
            {sortedSessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => onSwitchSession(session.id)}
              >
                <div className="session-item-content">
                  <div className="session-item-icon">
                    <i className="fa-solid fa-comment"></i>
                  </div>
                  <div className="session-item-info">
                    <span className="session-item-name" title={session.name}>
                      {session.name}
                    </span>
                    <span className="session-item-date">{formatSessionDate(session.lastActive || session.createdAt)}</span>
                    <span className="session-item-meta">
                      {session.isDocumentIndexed && session.documents && session.documents.length > 0
                        ? `📄 ${session.documents.length} document${session.documents.length > 1 ? 's' : ''}`
                        : 'No documents'}
                    </span>
                  </div>
                </div>
                <button
                  className="session-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  title="Delete session"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="user-profile-card">
          <div className="user-profile-info">
            <span className="user-label">Logged In As</span>
            <span className="user-email" title={userEmail}>{userEmail}</span>
          </div>
          <button className="signout-btn" onClick={onSignOut} title="Sign Out">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </section>
      </div>

      <div className="sidebar-footer">
        <p>Powered by OpenRouter & Qdrant</p>
      </div>
    </aside>
  );
}