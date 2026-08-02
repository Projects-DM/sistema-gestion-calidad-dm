import * as Icons from 'lucide-react';

/**
 * alertVisual helpers
 *
 * Sprint 184 — Map the semantic output of the certified Alert badge
 * renderers (color: gray|yellow|orange|red, icon: Lucide name) into
 * existing Tailwind utility classes. Pure presentational mapping only.
 * The UI never computes alert state — it renders what the runtime
 * produces.
 */

export function alertVisualClasses(color) {
  switch (color) {
    case 'red':
      return { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
    case 'orange':
      return { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
    case 'yellow':
      return { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' };
    case 'gray':
    default:
      return { badge: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  }
}

export function resolveAlertIcon(iconName) {
  return Icons[iconName] || Icons.AlertTriangle;
}
