import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { bootDurableOccurrenceLedger } from './core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js';

const ROUTER_BASENAME = '/sistema-gestion-calidad-dm';

import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import DynamicModuleById from './pages/DynamicModuleById';
import DynamicModule from './pages/DynamicModule';
import DynamicForm from './pages/DynamicForm';
import Configuration from './pages/Configuration';
import Users from './pages/Users';
import WorkspaceFoundation from './pages/WorkspaceFoundation';
import ProtectedRoute from './components/ProtectedRoute';
import { RuntimePlaygroundSandbox } from './runtime/playground';


function App() {
  const { tenantId } = useAuth();

  useEffect(() => {
    if (tenantId) {
      bootDurableOccurrenceLedger();
    }
  }, [tenantId]);

  return (
    <Router basename={ROUTER_BASENAME}>
      <Routes>
        <Route path="login" element={<Login />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route 
            path="configuracion" 
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <Configuration />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="usuarios" 
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <Users />
              </ProtectedRoute>
            } 
          />
          


          <Route path="runtime-playground" element={<RuntimePlaygroundSandbox />} />

          <Route path=":moduleSlug" element={<DynamicModule />} />
          <Route path=":moduleId" element={<DynamicModuleById />} />
          <Route path="modulo/:moduleSlug/:formSlug" element={<DynamicForm />} />
          
        </Route>

      </Routes>
    </Router>
  );
}

export default App;