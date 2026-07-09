import ModuleManager from '../components/workspace/ModuleManager';

export default function WorkspaceFoundation() {
  return (
    <div className="space-y-6">
      {/* Workspace embebido dentro de Configuration → Módulos */}
      <ModuleManager />
    </div>
  );
}


