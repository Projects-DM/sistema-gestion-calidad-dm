import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical, Settings, MoveUp, MoveDown, Download, Loader2 } from 'lucide-react';
import { dynamicService } from '../services/dynamicService';
import { moveUp as motorMoveUp, moveDown as motorMoveDown, toOrderedIds } from '../order-motor/UniversalOrderMotor';
import { reorderFormFieldsOrder } from '../order-motor/adapters/FormBuilderOrderAdapter';

export default function FormBuilder({ formDef, importMode, importFormDef, onImportComplete }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newField, setNewField] = useState({
    name: '',
    label: '',
    field_type: 'text',
    required: true,
    options: {}
  });

  const [optUnit, setOptUnit] = useState('');
  const [optChoices, setOptChoices] = useState('');

  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editOptUnit, setEditOptUnit] = useState('');
  const [editOptChoices, setEditOptChoices] = useState('');

  const loadFields = async () => {
    try {
      setLoading(true);
      if (importMode && importFormDef?.fields) {
        const withIds = importFormDef.fields.map((f, i) => ({
          ...f,
          id: `_local_${Date.now()}_${i}`,
          order_index: f.order_index || i + 1,
        }));
        setFields(withIds);
      } else {
        const data = await dynamicService.getFormFields(formDef.id);
        setFields(data);
      }
    } catch (error) {
      console.error('Error loading fields:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, [formDef?.id, importMode]);

  const genId = () => `_l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const handleAddField = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const slugName = newField.name || newField.label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      let optionsJson = {};
      if (newField.field_type === 'number' && optUnit) {
        optionsJson.unit = optUnit;
      }
      if (newField.field_type === 'select' && optChoices) {
        optionsJson.choices = optChoices.split(',').map(s => s.trim());
      }

      if (importMode) {
        const orderIndex = fields.length > 0 ? Math.max(...fields.map(f => f.order_index)) + 1 : 1;
        const newFieldEntry = {
          id: genId(),
          name: slugName,
          label: newField.label,
          field_type: newField.field_type,
          required: newField.required,
          options: optionsJson,
          order_index: orderIndex,
        };
        setFields(prev => [...prev, newFieldEntry]);
      } else {
        const supabase = (await import('../lib/supabase')).getSupabaseClient();
        const order_index = fields.length > 0 ? Math.max(...fields.map(f => f.order_index)) + 1 : 1;
        const { error } = await supabase.from('sgc_form_fields').insert({
          form_id: formDef.id,
          name: slugName,
          label: newField.label,
          field_type: newField.field_type,
          required: newField.required,
          options: optionsJson,
          order_index: order_index
        });
        if (error) throw error;
        await loadFields();
      }

      setIsAdding(false);
      setNewField({ name: '', label: '', field_type: 'text', required: true, options: {} });
      setOptUnit('');
      setOptChoices('');
    } catch (error) {
      alert('Error guardando campo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (id) => {
    if (!window.confirm('¿Eliminar este campo?')) return;
    try {
      if (importMode) {
        setFields(prev => prev.filter(f => f.id !== id));
      } else {
        const supabase = (await import('../lib/supabase')).getSupabaseClient();
        await supabase.from('sgc_form_fields').delete().eq('id', id);
        await loadFields();
      }
    } catch (error) {
      alert('Error eliminando campo: ' + error.message);
    }
  };

  const handleStartEdit = (field) => {
    setIsAdding(false);
    setEditingFieldId(field.id);
    setEditField({
      label: field.label,
      field_type: field.field_type,
      required: field.required,
      options: field.options || {}
    });
    setEditOptUnit(field.options?.unit || '');
    setEditOptChoices(field.options?.choices ? field.options.choices.join(', ') : '');
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditField(null);
    setEditOptUnit('');
    setEditOptChoices('');
  };

  const handleUpdateField = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let optionsJson = {};
      if (editField.field_type === 'number' && editOptUnit) {
        optionsJson.unit = editOptUnit;
      }
      if (editField.field_type === 'select' && editOptChoices) {
        optionsJson.choices = editOptChoices.split(',').map(s => s.trim());
      }

      if (importMode) {
        setFields(prev => prev.map(f =>
          f.id === editingFieldId
            ? { ...f, label: editField.label, field_type: editField.field_type, required: editField.required, options: optionsJson }
            : f
        ));
      } else {
        await dynamicService.updateField(editingFieldId, {
          label: editField.label,
          field_type: editField.field_type,
          required: editField.required,
          options: optionsJson
        });
        await loadFields();
      }

      handleCancelEdit();
    } catch (error) {
      alert('Error actualizando campo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveField = (index, direction) => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields.map((f, i) => ({ ...f, order_index: i + 1 })));
  };

  const handleMoveToDb = async (field, index, direction) => {
    const sequenceOrdered = fields;
    const targetId = field.id;
    const nextSequence = direction === 'up' ? motorMoveUp(sequenceOrdered, targetId) : motorMoveDown(sequenceOrdered, targetId);
    const nextOrderedIds = toOrderedIds(nextSequence);
    const res = await reorderFormFieldsOrder({
      formId: formDef.id,
      orderedIds: nextOrderedIds,
    });
    if (res?.ok) {
      setFields(res.refreshedFields || []);
    } else {
      alert(res?.errorMessage || 'Error reordenando');
    }
  };

  const handleSaveImport = async () => {
    if (!importFormDef) return;
    try {
      setSaving(true);
      const supabase = (await import('../lib/supabase')).getSupabaseClient();

      const formName = importFormDef.name || 'Formulario Importado';
      const formSlug = formName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const formModuleId = importFormDef.moduleId || null;

      const { data: form, error: formError } = await supabase.from('sgc_forms').insert({
        module_id: formModuleId,
        name: formName,
        slug: formSlug,
        description: '',
        engine_type: 'BaseGeneric',
        roles_allowed: ['administrador', 'calidad', 'operativo'],
      }).select().single();

      if (formError) throw formError;

      const fieldsToInsert = fields.map((f, i) => ({
        form_id: form.id,
        name: f.name || f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: f.label,
        field_type: f.field_type,
        required: f.required,
        options: f.options || {},
        order_index: i + 1,
      }));

      const { error: fieldsError } = await supabase.from('sgc_form_fields').insert(fieldsToInsert);
      if (fieldsError) throw fieldsError;

      onImportComplete?.(form);
    } catch (error) {
      alert('Error guardando formulario: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const displayName = importMode ? (importFormDef?.name || 'Nuevo Formulario Importado') : formDef?.name;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* List of existing fields */}
      <div className="p-6 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Campos Configurados</h3>
          {importMode && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <Download className="w-3 h-3" /> Vista Previa - Sin Guardar
            </span>
          )}
        </div>

        {loading && !isAdding && <div className="text-gray-500">Cargando campos...</div>}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-gray-300 cursor-move">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{field.label}</span>
                  {field.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Requerido</span>}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1">ID: {field.name} | Tipo: {field.field_type}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={index === 0 || loading}
                  onClick={() => {
                    if (importMode) {
                      handleMoveField(index, 'up');
                    } else {
                      handleMoveToDb(field, index, 'up');
                    }
                  }}
                  className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Subir"
                >
                  <MoveUp className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={index === fields.length - 1 || loading}
                  onClick={() => {
                    if (importMode) {
                      handleMoveField(index, 'down');
                    } else {
                      handleMoveToDb(field, index, 'down');
                    }
                  }}
                  className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Bajar"
                >
                  <MoveDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleStartEdit(field)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Editar campo"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}

          {fields.length === 0 && !loading && (
            <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
              Este formulario aún no tiene campos. Agrega el primero abajo.
            </div>
          )}
        </div>
      </div>

      {/* Edit / Add New Field Form */}
      <div className="p-6">
        {editingFieldId ? (
          <form onSubmit={handleUpdateField} className="bg-amber-50 p-6 rounded-xl border border-amber-200 space-y-4">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-500" /> Editando Campo
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Etiqueta / Pregunta *</label>
                <input
                  type="text" required
                  value={editField.label}
                  onChange={e => setEditField({...editField, label: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ej. Nivel de pH"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Dato *</label>
                <select
                  required
                  value={editField.field_type}
                  onChange={e => setEditField({...editField, field_type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="text">Texto corto</option>
                  <option value="textarea">Texto largo (Observaciones)</option>
                  <option value="number">Número</option>
                  <option value="boolean">Casilla (Sí/No - Cumple/No Cumple)</option>
                  <option value="select">Lista desplegable</option>
                  <option value="signature">Firma digital</option>
                </select>
              </div>
            </div>

            {editField.field_type === 'number' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Unidad de Medida (Opcional)</label>
                <input
                  type="text"
                  value={editOptUnit}
                  onChange={e => setEditOptUnit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ej. °C, ppm, kg"
                />
              </div>
            )}

            {editField.field_type === 'select' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Opciones (separadas por coma) *</label>
                <input
                  type="text" required
                  value={editOptChoices}
                  onChange={e => setEditOptChoices(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ej. Bueno, Regular, Malo"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox" id="edit-req"
                checked={editField.required}
                onChange={e => setEditField({...editField, required: e.target.checked})}
                className="w-4 h-4 text-primary focus:ring-primary rounded"
              />
              <label htmlFor="edit-req" className="text-sm font-bold text-gray-700 cursor-pointer">
                Este campo es obligatorio
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button" onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={loading}
                className="px-6 py-2 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Actualizar Campo
              </button>
            </div>
          </form>
        ) : !isAdding ? (
          <button
            onClick={() => { setIsAdding(true); handleCancelEdit(); }}
            className="w-full flex justify-center items-center gap-2 py-4 border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 rounded-xl font-bold transition-colors"
          >
            <Plus className="w-5 h-5" /> Agregar Nuevo Campo
          </button>
        ) : (
          <form onSubmit={handleAddField} className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Configuración del Nuevo Campo
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Etiqueta / Pregunta *</label>
                <input
                  type="text" required
                  value={newField.label}
                  onChange={e => setNewField({...newField, label: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ej. Nivel de pH"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Dato *</label>
                <select
                  required
                  value={newField.field_type}
                  onChange={e => setNewField({...newField, field_type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="text">Texto corto</option>
                  <option value="textarea">Texto largo (Observaciones)</option>
                  <option value="number">Número</option>
                  <option value="boolean">Casilla (Sí/No - Cumple/No Cumple)</option>
                  <option value="select">Lista desplegable</option>
                  <option value="signature">Firma digital</option>
                </select>
              </div>
            </div>

            {newField.field_type === 'number' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Unidad de Medida (Opcional)</label>
                <input
                  type="text"
                  value={optUnit}
                  onChange={e => setOptUnit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ej. °C, ppm, kg"
                />
              </div>
            )}

            {newField.field_type === 'select' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Opciones (separadas por coma) *</label>
                <input
                  type="text" required
                  value={optChoices}
                  onChange={e => setOptChoices(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ej. Bueno, Regular, Malo"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox" id="req"
                checked={newField.required}
                onChange={e => setNewField({...newField, required: e.target.checked})}
                className="w-4 h-4 text-primary focus:ring-primary rounded"
              />
              <label htmlFor="req" className="text-sm font-bold text-gray-700 cursor-pointer">
                Este campo es obligatorio
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button" onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={loading}
                className="px-6 py-2 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Guardar Campo
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Import Save Button */}
      {importMode && (
        <div className="px-6 pb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <Download className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-900 text-sm">Formulario en vista previa</p>
                <p className="text-xs text-purple-700">
                  Los cambios solo están en memoria. Al guardar se creará el formulario y todos sus campos en la base de datos.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => onImportComplete?.(null)}
                className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={handleSaveImport}
                disabled={saving || fields.length === 0}
                className="px-6 py-2.5 bg-purple-600 text-white font-bold hover:bg-purple-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar Formulario con Campos Importados
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
