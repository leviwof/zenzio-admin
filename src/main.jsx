import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Service Worker so OS notifications fire even when the window is minimized.
// The SW runs independently of page visibility; reg.showNotification() is what
// desktopNotificationService uses as its primary notification path.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .catch(() => {}); // silent — fallback to Notification API if SW fails
}

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
