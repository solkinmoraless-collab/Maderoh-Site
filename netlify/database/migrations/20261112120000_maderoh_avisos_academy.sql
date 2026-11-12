-- Migración nueva. Netlify administra la transacción; no agregar BEGIN/COMMIT.
-- No altera cotizaciones ni precios guardados anteriormente.
CREATE TABLE public.maderoh_quote_notifications (
 quote_id uuid PRIMARY KEY REFERENCES public.maderoh_quotes(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,
 read_by text,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','accepted','failed','uncertain')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 available_at timestamptz NOT NULL DEFAULT now(),
 claim_token uuid,
 claimed_at timestamptz,
 provider_message_id text,
 last_error text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX maderoh_notices_pending ON public.maderoh_quote_notifications(available_at,created_at) WHERE state='pending';
CREATE INDEX maderoh_notices_unread ON public.maderoh_quote_notifications(created_at DESC) WHERE read_at IS NULL;
REVOKE ALL ON TABLE public.maderoh_quote_notifications FROM PUBLIC;
-- Los avisos comienzan con los folios nuevos: no reenviar el historial.
ALTER TABLE public.maderoh_events DROP CONSTRAINT maderoh_events_page_check;
ALTER TABLE public.maderoh_events ADD CONSTRAINT maderoh_events_page_check CHECK(page IN ('index.html','productos.html','producto.html','personaliza.html','preguntas-frecuentes.html','envios.html','facturacion.html','aviso-privacidad.html','terminos-condiciones.html','academy.html'));
