import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

// ⚠️ AAPKI GOOGLE CLIENT ID YAHAN PASTE KAREIN
const GOOGLE_CLIENT_ID = "711713021182-9i9k8q6vqd4afkeshshjtvk9v5a9ovlr.apps.googleusercontent.com";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);