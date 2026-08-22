import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { TenantIdProviderRegistrar } from './components/TenantIdProviderRegistrar.jsx'
import './core/capabilities/alert/enterprise-activation/index.js'
import { bootDurableOccurrenceLedger } from './core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js'

// Sprint 297 — Durability boot: register the durable completion ledger port and
// replay persisted completion FACTS (refresh / recuperación). Idempotent.
// Sprint 348 — boot is now lazy, triggered after AuthProvider + tenantId available.
// The boot is triggered from App.jsx via useEffect to ensure AuthContext is ready.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TenantIdProviderRegistrar />
      <App />
    </AuthProvider>
  </StrictMode>,
)
