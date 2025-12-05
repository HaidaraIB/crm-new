
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Clear any old primary color from localStorage to ensure consistency
if (typeof window !== 'undefined') {
  localStorage.removeItem('primaryColor');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
