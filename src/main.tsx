
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initBrowserEnvironment } from './utils/browserUtils'

// Initialize browser environment fallbacks if needed
initBrowserEnvironment();

createRoot(document.getElementById("root")!).render(<App />);
