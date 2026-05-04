import { useAuth } from '../hooks/useAuth';

/**
 * RoleGate component to conditionally render children based on user roles.
 * 
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles allowed to see the children
 * @param {React.ReactNode} props.children - Content to show if user has permission
 * @param {React.ReactNode} [props.fallback=null] - Optional content to show if user doesn't have permission
 */
export default function RoleGate({ allowedRoles, children, fallback = null }) {
  const { rol } = useAuth();

  if (!allowedRoles.includes(rol)) {
    return fallback;
  }

  return children;
}
