import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-500 text-sm font-medium animate-pulse">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = profile?.rol || 'consulta';

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If user is already on dashboard, don't redirect to dashboard to avoid loops
    if (location.pathname === '/dashboard') {
      return children; // Or show an access denied message
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
