import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppIntro } from './components/AppIntro'
import './styles.css'
import './admin-density.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppIntro><App /></AppIntro></React.StrictMode>)
