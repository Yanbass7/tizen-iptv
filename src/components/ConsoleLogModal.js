import React, { useState, useEffect } from 'react';
import './ConsoleLogModal.css';

const ConsoleLogModal = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    const captureLog = (method, ...args) => {
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      setLogs(prevLogs => [...prevLogs, { type: method, message, timestamp: new Date().toLocaleTimeString() }]);
      setIsVisible(true); // Make modal visible when a new log comes in
    };

    console.log = (...args) => {
      captureLog('log', ...args);
      originalConsoleLog(...args);
    };
    console.warn = (...args) => {
      captureLog('warn', ...args);
      originalConsoleWarn(...args);
    };
    console.error = (...args) => {
      captureLog('error', ...args);
      originalConsoleError(...args);
    };

    return () => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="console-log-modal">
      <div className="modal-header">
        <h3>Console Logs</h3>
        <button onClick={() => setIsVisible(false)}>X</button>
      </div>
      <div className="modal-content">
        {logs.map((log, index) => (
          <p key={index} className={`log-${log.type}`}>
            <span className="log-timestamp">[{log.timestamp}]</span> {log.message}
          </p>
        ))}
      </div>
    </div>
  );
};

export default ConsoleLogModal;
