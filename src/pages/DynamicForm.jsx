import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dynamicService } from '../services/dynamicService';

import BaseChecklist from '../components/engines/BaseChecklist';
import BaseMediciones from '../components/engines/BaseMediciones';
import BaseGeneric from '../components/engines/BaseGeneric';

export default function DynamicForm() {
  const { moduleSlug, formSlug } = useParams();
  const { user, rol } = useAuth();
  const navigate = useNavigate();

  const [formDef, setFormDef] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);
        const form = await dynamicService.getFormBySlug(formSlug);
        setFormDef(form);
        
        if (form) {
          if (form.roles_allowed && !form.roles_allowed.includes(rol)) {
             alert('No tienes permisos para acceder a este formulario.');
             navigate(`/${moduleSlug}`, { replace: true });
             return;
          }
          const formFields = await dynamicService.getFormFields(form.id);
          setFields(formFields);

          const initial = {};
          formFields.forEach(f => {
             if (f.field_type === 'boolean') initial[f.id] = false;
             else initial[f.id] = '';
          });
          setValues(initial);
        }
      } catch (error) {
        console.error('Error loading form:', error);
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [formSlug, rol, navigate, moduleSlug]);

  const handleChange = (fieldId, val) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await dynamicService.submitFormResponse(formDef.id, user.id, values);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/${moduleSlug}`);
      }, 2000);
    } catch (error) {
      alert('Error guardando registro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Cargando formulario...</p>
      </div>
    );
  }

  if (!formDef) {
    return <div className="p-8 text-center text-gray-500">Formulario no encontrado.</div>;
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro Guardado!</h2>
        <p className="text-gray-500">Serás redirigido al módulo...</p>
      </div>
    );
  }

  const renderEngine = () => {
    const props = { fields, values, onChange: handleChange };
    switch (formDef.engine_type) {
      case 'BaseChecklist':
        return <BaseChecklist {...props} />;
      case 'BaseMediciones':
        return <BaseMediciones {...props} />;
      // Añadir más motores (BaseTrazabilidad, BaseMantenimiento) aquí en el futuro
      default:
        return <BaseGeneric {...props} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <Link to={`/${moduleSlug}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{formDef.name}</h1>
          <p className="text-sm text-gray-500">{formDef.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        
        {renderEngine()}

        <div className="border-t border-gray-200 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Registro
          </button>
        </div>
      </form>
    </div>
  );
}
