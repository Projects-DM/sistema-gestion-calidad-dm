import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const data = await signIn(email, password);
      
      // We might need to check the profile status after sign in
      // In a real app, this logic could be in the AuthContext too
      if (data.user) {
         navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.message && err.message.includes('desactivada')) {
        setError(err.message);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-primary">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8ed7c50a7c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')"
        }}
      >
        <div className="absolute inset-0 bg-primary/85 backdrop-blur-[2px]"></div>
      </div>

      {/* Ambient decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-center justify-center p-4">
        
        {/* Left Side: Branding */}
        <div className="hidden md:flex flex-col w-1/2 pr-12 text-white">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="w-12 h-12 text-accent" />
            <h1 className="text-3xl font-bold tracking-tight">DM Distribuciones</h1>
          </div>
          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            Sistema de Gestión <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-200">
              de Calidad
            </span>
          </h2>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed max-w-md">
            Plataforma corporativa para el control, trazabilidad y aseguramiento de los estándares de calidad en todos los procesos de distribución.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>Trazabilidad en tiempo real</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>Auditoría y control de despachos</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>Reportes ejecutivos automatizados</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-[450px]">
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-secondary via-secondary to-accent"></div>
            
            <div className="p-8 sm:p-10">
              <div className="md:hidden flex items-center justify-center gap-2 mb-8 text-primary">
                <ShieldCheck className="w-8 h-8 text-secondary" />
                <h1 className="text-xl font-bold">DM Distribuciones</h1>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Acceso Corporativo</h3>
                <p className="text-gray-500 text-sm">Ingrese sus credenciales para continuar</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-shake">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 block">Correo Electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 text-sm outline-none" 
                      placeholder="usuario@dmdistribuciones.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 block">Contraseña</label>
                    <a href="#" className="text-xs font-medium text-primary hover:text-primary-light transition-colors">¿Olvidó su contraseña?</a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 text-sm outline-none" 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center pt-2">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                    Recordar sesión en este equipo
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 overflow-hidden"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span className="flex items-center gap-2">
                      Ingresar al Sistema
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>
              
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-400">
                  © 2026 DM Distribuciones. Sistema de acceso restringido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
