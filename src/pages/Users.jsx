import { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, UserPlus, Search, Edit2, Trash2, 
  Shield, Mail, Calendar, ArrowLeft, Download, X, Save, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabase';
import RoleGate from '../components/RoleGate';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.rol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (rol) => {
    const styles = {
      administrador: 'bg-red-100 text-red-700 border-red-200',
      calidad: 'bg-blue-100 text-blue-700 border-blue-200',
      operativo: 'bg-green-100 text-green-700 border-green-200',
      consulta: 'bg-gray-100 text-gray-700 border-gray-200',
      conductor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return styles[rol] || styles.consulta;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/dashboard" className="hover:text-primary flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver al Panel
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <UsersIcon className="w-7 h-7 text-accent" />
            Gestión de Usuarios
          </h1>
          <p className="text-xs text-gray-500 mt-1">Administre los roles y permisos del personal.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 transition-colors w-full sm:w-auto text-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-bold transition-all shadow-md shadow-primary/20 w-full sm:w-auto text-sm"
          >
            <UserPlus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o rol..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Nombre Completo</th>
                <th className="p-4 hidden sm:table-cell">Email</th>
                <th className="p-4">Rol / Permisos</th>
                <th className="p-4 hidden md:table-cell">Última Conexión</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-gray-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="p-4 pl-6 max-w-[220px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 shrink-0">
                          {user.nombre?.charAt(0) || 'U'}
                        </div>
                        <span className="text-sm font-semibold text-gray-900 truncate">{user.nombre}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-[200px] hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadge(user.rol)}`}>
                        <Shield className="w-3 h-3" />
                        <span className="capitalize">{user.rol}</span>
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-400 hover:text-primary bg-white border border-gray-200 rounded-lg shadow-sm transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg shadow-sm transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placeholder Modal for creating users */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-accent" /> Nuevo Usuario
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Para registrar nuevos usuarios, debe utilizar el panel de <strong>Supabase Auth</strong>. Luego, sus perfiles aparecerán aquí automáticamente.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-light transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
