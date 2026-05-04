import { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  const fetchAndSetProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Perfil no encontrado o error en query:', error.message);
        setProfile({ rol: 'consulta', nombre: 'Usuario' });
        return;
      }

      if (data && data.activo === false) {
        console.warn('Usuario inactivo, cerrando sesión');
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error crítico en fetchProfile:', error);
      setProfile({ rol: 'consulta', nombre: 'Usuario' });
    }
  }, [supabase]);

  useEffect(() => {
    console.log('AuthContext: Iniciando useEffect...');
    
    if (!supabase) {
      console.error('AuthContext: Error - Supabase no está configurado (faltan variables de entorno)');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Mecanismo de seguridad: Si Supabase no responde en 3 segundos, forzamos la carga a false
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('AuthContext: Supabase tardó demasiado en responder, forzando fin de carga para permitir navegación.');
        setLoading(false);
      }
    }, 3000);

    console.log('AuthContext: Suscribiendo a onAuthStateChange...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Evento recibido ->', event);
      
      if (mounted) {
        try {
          if (session?.user) {
            console.log('AuthContext: Usuario detectado ->', session.user.email);
            setUser(session.user);
            // Cargamos el perfil en segundo plano para no bloquear la UI
            fetchAndSetProfile(session.user.id);
          } else {
            console.log('AuthContext: Sin sesión activa');
            setUser(null);
            setProfile(null);
          }
        } catch (error) {
          console.error('AuthContext: Error en el manejador ->', error);
        } finally {
          // Liberamos la UI de inmediato
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription?.unsubscribe();
    };
  }, [supabase, fetchAndSetProfile]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const currentRol = profile?.rol || 'consulta';

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signOut,
    rol: currentRol,
    isAdmin: currentRol === 'administrador',
    isCalidad: currentRol === 'calidad',
    isOperativo: currentRol === 'operativo',
    isConsulta: currentRol === 'consulta',
    isConductor: currentRol === 'conductor',
  }), [user, profile, loading, currentRol]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
