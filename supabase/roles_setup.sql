-- 1. Definir los roles permitidos
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('administrador', 'calidad', 'operativo', 'consulta', 'conductor');
  END IF;
END $$;

-- 2. Crear tabla de perfiles con columnas específicas solicitadas
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT,
  email TEXT UNIQUE NOT NULL,
  rol user_role DEFAULT 'consulta' NOT NULL,
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad
DROP POLICY IF EXISTS "Perfiles visibles por autenticados" ON public.profiles;
CREATE POLICY "Perfiles visibles por autenticados" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios actualizan su propio perfil" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 5. Función y Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email, rol, activo)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), 
    new.email, 
    COALESCE((new.raw_user_meta_data->>'rol')::user_role, 'consulta'::user_role),
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- NOTA PARA CREAR USUARIOS INICIALES:
-- Debido a que Supabase cifra las contraseñas, la forma más profesional y segura
-- de crear estos usuarios es a través del Panel de Supabase (Authentication -> Users -> Add User)
-- o usando el SDK con la Service Role Key.
-- 
-- Emails a crear:
-- 1. administrador@dmdistribuciones.com (rol: administrador)
-- 2. calidad@dmdistribuciones.com (rol: calidad)
-- 3. operativo@dmdistribuciones.com (rol: operativo)
-- 4. consulta@dmdistribuciones.com (rol: consulta)
-- 5. conductor@dmdistribuciones.com (rol: conductor)
-- Contraseña: Calidad1023
