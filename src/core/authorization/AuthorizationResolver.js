// AuthorizationResolver (Sprint 53) — adaptador puro de autorización
// Centraliza exactamente la semántica actual de roles_allowed.includes(rol)
// para reutilización futura. No agrega roles, no cambia reglas, no toca navegación.

export function canAccessRole(requiredRoles, userRole) {
  if (!requiredRoles) return true;
  return requiredRoles.includes(userRole);
}

export function filterAuthorized(items, userRole) {
  return (items || []).filter((item) => canAccessRole(item?.roles_allowed, userRole));
}

