
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeElectronBridge } from './utils/electronBridge'

// Initialize Electron bridge for browser compatibility
initializeElectronBridge();

createRoot(document.getElementById("root")!).render(<App />);
