/**
 * DynamicModule
 *
 * Core Standard Shell — Sprint 61 (Capability Public Set Integration)
 *
 * This component is the certified CORE STANDARD SHELL (DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1).
 * From Sprint 61 onwards, ALL UI decisions (tabs, visibility, navigation) are driven
 * EXCLUSIVELY by the Capability Public Set returned by useCapabilityPublicSet.
 *
 * What this component KNOWS:
 *   - moduleSlug (from URL params, for routing and data loading)
 *   - modInfo    (module metadata from dynamicService — for display only)
 *   - forms      (form list from dynamicService — for display only)
 *   - Capability Public Set (via useCapabilityPublicSet — the only UI authority)
 *
 * What this component NEVER does:
 *   - Query documentRepositoriesService directly
 *   - Make UI decisions based on moduleSlug or module-specific conditions
 *   - Use if (moduleSlug === ...) or equivalent hardcodes
 *   - Import persistence, Core internals, or services for UI decisions
 *
 * Architecture:
 *   useCapabilityPublicSet()
 *         ↓
 *   CapabilityPublicSet (single source of truth for all UI structure)
 *         ↓
 *   DynamicModule renders tabs + content exclusively from capabilityPublicSet
 */

import { useState, useEffect, useMemo, lazy, useRef, Suspense } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dynamicService } from '../services/dynamicService';
import DocumentModule from '../components/DocumentModule';
import DynamicRecordsView from '../components/DynamicRecordsView';
import ModuleDocumentViewer from '../modules/documentViewer/ModuleDocumentViewer';
import { CapabilityDiscovery } from '../core/capabilities/CapabilityDiscovery';
import { useCapabilityPublicSet } from '../core/capabilities/public/useCapabilityPublicSet';
import { OperationalExperienceRegistry } from '../core/capabilities/experiences/OperationalExperienceRegistry';
import { isNavigationState, extractNavigationState } from '../core/navigation/NavigationStateContract.js';
import { useAlertRuntime } from '../hooks/useAlertRuntime';
import { projectResourceAlertState } from '../utils/alertResourceState';
import UnifiedAlertResourcePresentation from '../shared/components/alert/UnifiedAlertResourcePresentation';

// Sprint 290 — HIDE/DETACH (no DELETE). The "Alertas" operational experience
// leaves the PRIMARY module navigation surface. The domain, the registry, the
// runtime and AlertMonitoringExperience remain intact (AC-01/AC-02): only the
// PRESENTATION drops the experience from the user-facing experience list. The
// alert state is now shown INSIDE the real resources (DynamicForm, Repository),
// so the monitor is no longer the obliged place to find pending work.
const DETACHED_EXPERIENCE_KEYS = Object.freeze(['alert-monitoring']);

// Authorization capability — governs form access by role (certified, Sprint 52+)
const authorization = CapabilityDiscovery.discover('authorization');

// ---------------------------------------------------------------------------
// Icon resolver — maps Lucide icon name strings from Capability definitions
// to actual React components. Fallback to FileText for unknown icon names.
// ---------------------------------------------------------------------------
function resolveIcon(iconName) {
  return Icons[iconName] || Icons.FileText;
}

// ---------------------------------------------------------------------------
// Tab content renderers — one per capability key.
// These are purely presentational; the decision of WHICH tabs exist is
// made entirely by the Capability Public Set, not here.
// ---------------------------------------------------------------------------

// Sprint 291/292 — FORMAT CARD ALERT INDICATOR. Presentational only: consumes
// the projector output (projectResourceAlertState) already computed from the
// certified runtime projection. Sprint 295 — UNIFIED STANDARD: the format card
// delegates to the SAME UnifiedAlertResourcePresentation the repository and the
// category consume (AC-01: compact presentation of Sprint 292 preserved). The
// card answers ONLY "¿tiene alerta y cuándo debo prestarle atención?".
function FormatAlertState({ state }) {
  return <UnifiedAlertResourcePresentation state={state} />;
}

function FormsContent({ forms, moduleSlug, moduleId }) {
  // Sprint 291 — SINGLE runtime consumption for the format card grid. The alert
  // state is presented BEFORE entering the form: each format card that carries
  // a projected alert shows its own visual state. consume → presenta (AC-24);
  // never rebuilds identity/schedules/completion here.
  const { occurrences, existing } = useAlertRuntime({
    moduleId,
    module: moduleSlug,
    moduleSlug,
  });

  // Project per-format alert state ONCE for the whole grid (same certified
  // projector the form/repository consume). resourceId = form.id (canonical),
  // resource = real form snapshot for enrichment (Resolver envelope).
  const alertStatesByForm = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(occurrences)) return map;
    for (const form of forms) {
      const resource = (existing?.forms || []).find(
        (f) => String(f.id ?? f.slug ?? '') === String(form.id ?? form.slug ?? ''),
      ) || form;
      const state = projectResourceAlertState({
        occurrences,
        resourceKind: 'dynamicForms',
        resourceId: form.id ?? form.slug,
        resource,
      });
      if (state) map.set(String(form.id ?? form.slug ?? ''), state);
    }
    return map;
  }, [occurrences, existing, forms]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <div className="w-1.5 h-6 bg-accent rounded-full" />
        Formatos Disponibles
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {forms.map((form) => {
          const IconComponent = resolveIcon(form.icon || 'FileText');
          const alertState = alertStatesByForm.get(String(form.id ?? form.slug ?? '')) || null;
          return (
            <Link
              to={`/modulo/${moduleSlug}/${form.slug}`}
              key={form.id}
              className="group flex flex-col bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 bg-gray-50 text-primary border border-gray-100">
                <IconComponent className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                {form.name}
              </h3>

              {/* Sprint 291/292 — compact format card alert indicator (before
                  entering the form). Hierarchy: icono → nombre → 8-12px → alerta
                  → acción (AC-07/AC-08). Tight spacing, no secondary metadata. */}
              <FormatAlertState state={alertState} />

              <p className="text-sm text-gray-500 mt-2 mb-3">{form.description}</p>

              <div className="flex items-center text-sm font-bold text-primary group-hover:text-accent transition-colors mt-auto pt-2">
                Ingresar
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}

        {forms.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-500">
            No hay formularios configurados para este módulo.
          </div>
        )}
      </div>
    </div>
  );
}

function RecordsContent({ moduleId, moduleName }) {
  return <DynamicRecordsView moduleId={moduleId} moduleName={moduleName} />;
}

function RepositoryContent({ moduleSlug, navigationContext }) {
  return (
    <div className="space-y-6">
      <ModuleDocumentViewer moduleSlug={moduleSlug} navigationContext={navigationContext} />
    </div>
  );
}

function OperationalExperiencesContent({ enabledExperiences, moduleSlug, moduleName }) {
  const [activeExperience, setActiveExperience] = useState(null);
  const [ExperienceComponent, setExperienceComponent] = useState(null);
  const [loadingExperience, setLoadingExperience] = useState(false);

  useEffect(() => {
    if (!enabledExperiences || enabledExperiences.length === 0) return;
    if (!activeExperience) {
      setActiveExperience(enabledExperiences[0]?.experienceKey);
    }
  }, [enabledExperiences, activeExperience]);

  useEffect(() => {
    if (!activeExperience) return;
    let cancelled = false;

    async function loadExperience() {
      setLoadingExperience(true);
      try {
        const Component = await OperationalExperienceRegistry.resolveComponent(activeExperience);
        if (!cancelled && Component) {
          setExperienceComponent(() => Component);
        }
      } catch (err) {
        console.error('DynamicModule: error loading experience', activeExperience, err);
      } finally {
        if (!cancelled) setLoadingExperience(false);
      }
    }

    loadExperience();
    return () => { cancelled = true; };
  }, [activeExperience]);

  if (!enabledExperiences || enabledExperiences.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500">
        No hay experiencias operacionales configuradas para este módulo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Experience sub-tabs */}
      {enabledExperiences.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {enabledExperiences.map((exp) => {
            const ExpIcon = resolveIcon(exp.icon || exp.metadata?.icon || 'Zap');
            return (
              <button
                key={exp.experienceKey}
                onClick={() => { setActiveExperience(exp.experienceKey); setExperienceComponent(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  activeExperience === exp.experienceKey
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ExpIcon className="w-4 h-4" />
                {exp.displayName || exp.metadata?.name || exp.experienceKey}
              </button>
            );
          })}
        </div>
      )}

      {/* Experience content */}
      {loadingExperience ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Cargando experiencia...</span>
        </div>
      ) : ExperienceComponent ? (
        <ExperienceComponent experienceKey={activeExperience} moduleSlug={moduleSlug} moduleName={moduleName} />
      ) : (
        <div className="py-10 text-center text-gray-500">
          Seleccione una experiencia operacional.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DynamicModule — Core Standard Shell
// ---------------------------------------------------------------------------

export default function DynamicModule() {
  const { moduleSlug } = useParams();
  const { rol } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Module metadata and forms — loaded from service for display purposes only.
  // These are NOT used for UI decisions (tabs, visibility, navigation).
  const [modInfo, setModInfo]     = useState(null);
  const [forms, setForms]         = useState([]);
  const [loadingModule, setLoadingModule] = useState(true);

  // Active tab key — driven by Capability Public Set (set to first tab on load).
  const [activeTab, setActiveTab] = useState(null);

  // Sprint 190 — One-Shot Navigation Consumption.
  // Sprint 192 — Navigation Intent Lifecycle Finalization.
  // The navigation intent has a SINGLE lifecycle:
  //   Router → Navigation Intent → consume() → aplicar navegación → destroy() → estado limpio.
  // After it is applied (activeTab), navigationState is DESTROYED (set to
  // null) so it can never modify activeTab again. This eliminates the
  // sticky-navigation bug where the tab effect re-read navigationState on
  // every activeTab change. navigationContext is delivered separately so
  // the Repository can consume it (one-shot, Sprint 189) while the intent
  // itself never survives the first useful render.
  const [navigationState, setNavigationState] = useState(null);
  const [navigationContext, setNavigationContext] = useState(null);
  const navigationProcessedRef = useRef(null);

  useEffect(() => {
    const locationState = location.state || {};
    const key = JSON.stringify(
      ['tab', 'navigationContext', 'selectedRecord', 'selectedForm', 'selectedDocument'].reduce((acc, k) => {
        acc[k] = locationState[k] ?? null;
        return acc;
      }, {}),
    );
    if (key === navigationProcessedRef.current) return; // already handled this intent
    navigationProcessedRef.current = key;
    if (!isNavigationState(locationState)) return; // nothing to consume — keep current context
    const consumed = extractNavigationState(locationState);
    setNavigationState(consumed);
    if (consumed.navigationContext) setNavigationContext(consumed.navigationContext);
    // Strips the navigation state from the current history entry WITHOUT
    // adding a new history entry (replace: non-historical).
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  // Load module metadata and forms.
  // dynamicService is used here ONLY for fetching display data (name, description, forms).
  // It is NOT consulted for any UI capability decision.
  useEffect(() => {
    let cancelled = false;

    async function loadModuleAndForms() {
      try {
        setLoadingModule(true);
        setActiveTab(null);

        const moduleData = await dynamicService.getModuleBySlug(moduleSlug);
        if (cancelled) return;
        setModInfo(moduleData);

        if (moduleData) {
          const formsData = await dynamicService.getFormsByModule(moduleData.id);
          if (cancelled) return;
          setForms(formsData);
        }
      } catch (err) {
        console.error('DynamicModule: error loading module data', err);
      } finally {
        if (!cancelled) setLoadingModule(false);
      }
    }

    loadModuleAndForms();
    return () => { cancelled = true; };
  }, [moduleSlug, navigate]);

  // ---------------------------------------------------------------------------
  // Capability Public Set — SINGLE SOURCE OF TRUTH for all UI decisions.
  //
  // DynamicModule reads ONLY this artifact to determine:
  //   - which tabs to render
  //   - which capabilities are available
  //   - what order and label each tab has
  //
  // The hook internally uses CapabilityPublicSetAdapter → ModuleCapabilityResolver.
  // DynamicModule has no visibility into that pipeline.
  // ---------------------------------------------------------------------------
  const { capabilityPublicSet, loading: loadingCapabilities } = useCapabilityPublicSet({
    moduleSlug,
    moduleId: modInfo?.id ?? null,
  });

  // Set the default active tab once the Capability Public Set is resolved.
  // The default is always the first tab in capability order (order: 1 → 'forms').
  // Sprint 184/190: honor a tab from the ONE-SHOT navigation state (consumed
  // once by the NavigationStateConsumer) for records / repository intents.
  // Sprint 192: the navigation intent is DESTROYED (set to null) immediately
  // after it is applied. It can never modify activeTab again — the tab effect
  // will read `navigationState?.tab === undefined` on subsequent runs and
  // fall through to the default, leaving activeTab free for the user.
  useEffect(() => {
    if (!capabilityPublicSet) return;
    const fromState = navigationState?.tab;
    if (fromState && capabilityPublicSet.getTab(fromState)) {
      setActiveTab(fromState);
      setNavigationState(null); // destroy the intent immediately after applying
      return;
    }
    if (navigationState) {
      setNavigationState(null); // intent present but not applicable — destroy anyway
    }
    if (!activeTab) {
      const defaultKey = capabilityPublicSet.getDefaultTabKey();
      if (defaultKey) setActiveTab(defaultKey);
    }
  }, [capabilityPublicSet, activeTab, navigationState?.tab]);

  // Forms are filtered by role authorization (capability: authorization, Sprint 52+).
  // This is a display-level filter, not a capability decision.
  const filteredForms = forms.filter((f) => authorization?.canAccessRole(f?.roles_allowed, rol));

  // Tabs are built exclusively from the Capability Public Set.
  // No hardcodes. No moduleSlug conditions. No service calls.
  //
  // Sprint 290 — HIDE/DETACH of the "Alertas" operational experience from the
  // PRIMARY navigation. The experience list shown to the user excludes the
  // detached alert-monitoring surface (other operational experiences remain).
  // Presentation-only: the registry/domain and AlertMonitoringExperience stay
  // intact and reachable through their internal registry contract.
  const visibleExperiences = useMemo(
    () => (capabilityPublicSet?.getEnabledExperiences() ?? []).filter(
      (exp) => !DETACHED_EXPERIENCE_KEYS.includes(exp.experienceKey),
    ),
    [capabilityPublicSet],
  );

  const tabs = capabilityPublicSet?.getTabs() ?? [];
  // When the ONLY enabled experience was the detached alert-monitoring one,
  // the "Experiencias Operacionales" tab itself is hidden (no dead tab).
  const visibleTabs = tabs.filter(
    (tab) => tab.key !== 'operational-experiences' || visibleExperiences.length > 0,
  );

  // ---------------------------------------------------------------------------
  // Loading state: wait for both module data and capabilities to resolve.
  // ---------------------------------------------------------------------------
  const isLoading = loadingModule || (modInfo != null && loadingCapabilities);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Cargando módulo...</p>
      </div>
    );
  }

  if (!modInfo) {
    return (
      <div className="p-8 text-center text-gray-500">
        Módulo no encontrado.
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab content — rendered by capability key.
  // The existence of each case here does NOT enable the tab;
  // the Capability Public Set is the authority for that.
  // ---------------------------------------------------------------------------
  function renderTabContent() {
    switch (activeTab) {
      case 'forms':
        return <FormsContent forms={filteredForms} moduleSlug={moduleSlug} moduleId={modInfo.id} />;
      case 'records':
        return <RecordsContent moduleId={modInfo.id} moduleName={modInfo.name} />;
      case 'repository':
        return <RepositoryContent moduleSlug={moduleSlug} navigationContext={navigationContext} />;
      case 'operational-experiences':
        return (
          <OperationalExperiencesContent
            enabledExperiences={visibleExperiences}
            moduleSlug={moduleSlug}
            moduleName={modInfo.name}
          />
        );
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Module Header */}
      <div className="bg-primary rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-4 uppercase tracking-widest">
              {modInfo.name}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Programa de {modInfo.name}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              {modInfo.description || `Gestión y control de ${modInfo.name.toLowerCase()}.`}
            </p>
          </div>

          <DocumentModule
            module={modInfo.slug}
            title={`Programa de ${modInfo.name}`}
            description="Documento técnico normativo del proceso."
          />
        </div>
      </div>

      {/* Tabs — built exclusively from Capability Public Set */}
      <div className="flex flex-wrap border-b border-gray-200 gap-2 sm:gap-8">
        {visibleTabs.map((tab) => {
          const TabIcon = resolveIcon(tab.icon);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              disabled={!tab.enabled}
              className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center gap-2">
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {renderTabContent()}

    </div>
  );
}
