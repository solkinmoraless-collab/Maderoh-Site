-- MADEROH / Netlify Database / Esquema inicial 1
-- Ejecutar completo en SQL console de la NUEVA base vacia de Netlify.
-- No ejecutar en Supabase. No contiene contrasenas ni datos de clientes.
-- Crea la estructura; NO conecta la web ni importa informacion existente.
-- Las escrituras simultaneas y autorizaciones necesitan el backend adaptado.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(4210940);

CREATE TABLE IF NOT EXISTS public.maderoh_migrations (
  version integer PRIMARY KEY CHECK (version > 0),
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maderoh_products (
  id bigint PRIMARY KEY CHECK (id > 0),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maderoh_product_document_id CHECK (
    document ? 'id' AND jsonb_typeof(document->'id') = 'number'
    AND document->'id' = to_jsonb(id)
  )
);

CREATE TABLE IF NOT EXISTS public.maderoh_settings (
  key text PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 100),
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maderoh_admins (
  username text PRIMARY KEY CHECK (username ~ '^[a-z0-9._-]{3,40}$'),
  password_hash text NOT NULL CHECK (password_hash ~ '^[a-f0-9]{128}$'),
  password_salt text NOT NULL CHECK (length(password_salt) BETWEEN 16 AND 256),
  password_algorithm text NOT NULL DEFAULT 'scrypt-N131072-r8-p1'
    CHECK (password_algorithm = 'scrypt-N131072-r8-p1'),
  generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maderoh_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  username text NOT NULL REFERENCES public.maderoh_admins(username),
  generation integer NOT NULL CHECK (generation > 0),
  csrf_hash text NOT NULL CHECK (csrf_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS maderoh_sessions_expiry ON public.maderoh_sessions(expires_at);
CREATE INDEX IF NOT EXISTS maderoh_sessions_admin ON public.maderoh_sessions(username);

CREATE TABLE IF NOT EXISTS public.maderoh_quotes (
  id uuid PRIMARY KEY,
  folio text NOT NULL UNIQUE CHECK (length(folio) BETWEEN 1 AND 80),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  followup jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(followup) = 'object'),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maderoh_quote_document_id CHECK (
    snapshot ? 'id' AND jsonb_typeof(snapshot->'id') = 'string'
    AND snapshot->>'id' = id::text
  ),
  CONSTRAINT maderoh_quote_document_folio CHECK (
    snapshot ? 'folio' AND jsonb_typeof(snapshot->'folio') = 'string' AND snapshot->>'folio' = folio
  )
);
CREATE INDEX IF NOT EXISTS maderoh_quotes_date ON public.maderoh_quotes(created_at DESC);

-- Un seguimiento puede cambiar; el contenido original del folio se conserva.
CREATE OR REPLACE FUNCTION public.maderoh_preserve_quote_snapshot()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.folio IS DISTINCT FROM OLD.folio
    OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint
    OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'La cotizacion original es inmutable; crea un folio nuevo.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS maderoh_quote_snapshot_guard ON public.maderoh_quotes;
CREATE TRIGGER maderoh_quote_snapshot_guard BEFORE UPDATE ON public.maderoh_quotes
  FOR EACH ROW EXECUTE FUNCTION public.maderoh_preserve_quote_snapshot();

CREATE TABLE IF NOT EXISTS public.maderoh_events (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('page_view','product_view','product_click','quote_click','whatsapp_click','request_created')),
  page text NOT NULL CHECK (page IN ('index.html','productos.html','producto.html','personaliza.html','preguntas-frecuentes.html','envios.html','facturacion.html','aviso-privacidad.html','terminos-condiciones.html')),
  product_id bigint CHECK (product_id > 0),
  visitor_hash text NOT NULL CHECK (visitor_hash ~ '^[a-f0-9]{64}$'),
  session_hash text NOT NULL CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  source text NOT NULL CHECK (source IN ('direct','facebook','instagram','tiktok','youtube','google','whatsapp','other')),
  device text NOT NULL CHECK (device IN ('mobile','tablet','desktop')),
  CHECK (type NOT IN ('product_view','product_click') OR product_id IS NOT NULL)
);
-- No se guardan nombres, telefonos, mensajes ni IP en esta tabla de eventos.
-- Sin FK a productos: conservar las estadisticas de modelos retirados.
CREATE INDEX IF NOT EXISTS maderoh_events_date ON public.maderoh_events(occurred_at);
CREATE INDEX IF NOT EXISTS maderoh_events_product_date ON public.maderoh_events(product_id, occurred_at);

CREATE TABLE IF NOT EXISTS public.maderoh_rate_limits (
  key text PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 180),
  hits jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(hits) = 'array'),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- El backend debe reservar cuotas dentro de una transaccion/bloqueo de fila.
CREATE INDEX IF NOT EXISTS maderoh_rate_limits_expiry ON public.maderoh_rate_limits(expires_at);

CREATE TABLE IF NOT EXISTS public.maderoh_media (
  id uuid PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES public.maderoh_products(id),
  blob_key text NOT NULL UNIQUE CHECK (length(blob_key) BETWEEN 1 AND 300),
  mime text NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 4194304),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maderoh_media_product ON public.maderoh_media(product_id, position);

CREATE TABLE IF NOT EXISTS public.maderoh_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL CHECK (length(actor) BETWEEN 1 AND 100),
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 100),
  entity text NOT NULL CHECK (length(entity) BETWEEN 1 AND 200),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object')
);
CREATE INDEX IF NOT EXISTS maderoh_audit_date ON public.maderoh_audit(occurred_at);

-- Acceso exclusivo mediante las funciones del servidor y su rol de conexion.
-- No otorgar permisos a PUBLIC ni colocar la conexion en JavaScript publico.
REVOKE ALL ON TABLE public.maderoh_migrations, public.maderoh_products,
  public.maderoh_settings, public.maderoh_admins, public.maderoh_sessions,
  public.maderoh_quotes, public.maderoh_events, public.maderoh_rate_limits,
  public.maderoh_media, public.maderoh_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.maderoh_audit_id_seq FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maderoh_preserve_quote_snapshot() FROM PUBLIC;

INSERT INTO public.maderoh_migrations(version) VALUES (1) ON CONFLICT (version) DO NOTHING;
COMMIT;

-- Resultado esperado: 10 filas, una por cada tabla maderoh_.
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  AND table_name LIKE 'maderoh\_%' ESCAPE '\'
ORDER BY table_name;
