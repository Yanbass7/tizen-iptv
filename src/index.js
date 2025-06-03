import React from 'react';
import ReactDOM from 'react-dom/client';
// Import polyfills first for Tizen TV compatibility
import './utils/polyfills';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Import FontAwesome CSS
import '@fortawesome/fontawesome-free/css/all.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Stagewise Toolbar - Only in development mode
if (process.env.NODE_ENV === 'development') {
  import('@stagewise/toolbar-react').then(({ StagewiseToolbar }) => {
    // Create stagewise configuration
    const stagewiseConfig = {
      plugins: []
    };

    // Create a separate container for the toolbar
    let toolbarContainer = document.getElementById('stagewise-toolbar');
    if (!toolbarContainer) {
      toolbarContainer = document.createElement('div');
      toolbarContainer.id = 'stagewise-toolbar';
      document.body.appendChild(toolbarContainer);
    }

    // Create separate React root for the toolbar
    const toolbarRoot = ReactDOM.createRoot(toolbarContainer);
    toolbarRoot.render(<StagewiseToolbar config={stagewiseConfig} />);
  }).catch((error) => {
    console.warn('Stagewise toolbar could not be loaded:', error);
  });
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();
