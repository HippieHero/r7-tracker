import React from 'react'
import { createRoot } from 'react-dom/client'
import R7Tracker from './R7Tracker.jsx'

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(console.error)
    })
  }
}
registerSW()

createRoot(document.getElementById('root')).render(<R7Tracker />)
