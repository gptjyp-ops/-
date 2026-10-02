import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';import './style.css';
import HelpSupport from './HelpSupport';
import LanguageSwitch from './LanguageSwitch';
createRoot(document.getElementById('root')!).render(<React.StrictMode><LanguageSwitch/><App/><HelpSupport/></React.StrictMode>);
