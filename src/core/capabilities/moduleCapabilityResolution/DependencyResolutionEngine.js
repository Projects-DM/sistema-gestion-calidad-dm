/**
 * DependencyResolutionEngine
 *
 * Dependency resolution on capability packages.
 *
 * Input is capability packages with optional `dependencies` keys.
 * Output is a flattened/expanded set of packages.
 *
 * No business logic.
 * No infrastructure assumptions.
 */

function packageId(p) {
  return p?.packageId ?? p?.id;
}

/**
 * @param {object} params
 * @param {Array<object>} params.packages
 * @param {Array<object>} params.assignments
 * @param {object} params.options
 */
export async function resolveDependencies({ packages, assignments, options } = {}) {
  const byId = new Map((packages || []).map((p) => [packageId(p), p]));

  // Expand packages based on declared conceptual dependency keys.
  // `dependencies` is expected to be an array of package identifiers or keys.
  const seed = (packages || []).filter(Boolean);

  const visited = new Set();
  const stack = [...seed];

  while (stack.length) {
    const current = stack.pop();
    const id = packageId(current);
    if (!id || visited.has(id)) continue;
    visited.add(id);

    const deps = current?.dependencies || [];
    for (const dep of deps) {
      // Dependency can be either a packageId-like string or a definition key.
      // We keep it generic and attempt lookup by packageId.
      const depId = typeof dep === 'string' ? dep : dep?.packageId ?? dep?.id;
      if (!depId) continue;

      const depPkg = byId.get(depId);
      if (depPkg && !visited.has(packageId(depPkg))) {
        stack.push(depPkg);
      }
    }
  }

  return {
    expandedPackages: Array.from(visited).map((id) => byId.get(id)).filter(Boolean),
    seedAssignments: assignments || [],
    options: options || {},
  };
}

