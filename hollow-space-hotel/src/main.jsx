import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { addIcons } from 'ionicons'
import { defineCustomElement as defineIonIcon } from 'ionicons/components/ion-icon.js'
import {
  arrowBack,
  arrowForward,
  arrowForwardCircle,
  albums,
  archive,
  ban,
  barChart,
  bed,
  calendar,
  checkmarkCircle,
  documentText,
  flash,
  grid,
  home,
  lockClosed,
  logIn,
  logOut,
  moon,
  notificationsOutline,
  people,
  person,
  personAdd,
  personCircle,
  shieldCheckmark,
  sparkles,
  time,
} from 'ionicons/icons'
import './index.css'
import App from './App.jsx'

addIcons({
  'arrow-back': arrowBack,
  'arrow-forward': arrowForward,
  'arrow-forward-circle': arrowForwardCircle,
  albums,
  archive,
  ban,
  'bar-chart': barChart,
  bed,
  calendar,
  'checkmark-circle': checkmarkCircle,
  'document-text': documentText,
  flash,
  grid,
  home,
  'lock-closed': lockClosed,
  'log-in': logIn,
  'log-out': logOut,
  moon,
  'notifications-outline': notificationsOutline,
  people,
  person,
  'person-add': personAdd,
  'person-circle': personCircle,
  'shield-checkmark': shieldCheckmark,
  sparkles,
  time,
})

defineIonIcon()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
