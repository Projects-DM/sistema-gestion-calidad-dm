import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import './core/capabilities/alert/enterprise-activation/index.js'
import { bootDurableOccurrenceLedger } from './core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js'

// Sprint 297 — Durability boot: register the durable completion ledger port and
// replay persisted completion FACTS (refresh / recuperación). Idempotent.
bootDurableOccurrenceLedger();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
