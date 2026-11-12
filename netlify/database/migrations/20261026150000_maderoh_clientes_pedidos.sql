-- Maderóh: clientes, pedidos y registro interno de pagos.
-- Migración NUEVA: no reemplaza ni modifica las dos migraciones iniciales.
-- El ejecutor nativo controla la transacción. No añadir BEGIN/COMMIT.
CREATE TABLE public.maderoh_clients (
 id uuid PRIMARY KEY,
 document jsonb NOT NULL CHECK (jsonb_typeof(document)='object'),
 creation_fingerprint text NOT NULL CHECK (creation_fingerprint ~ '^[a-f0-9]{64}$'),
 revision bigint NOT NULL DEFAULT 0 CHECK (revision>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.maderoh_orders (
 id uuid PRIMARY KEY,
 quote_id uuid NOT NULL UNIQUE REFERENCES public.maderoh_quotes(id),
 client_id uuid NOT NULL REFERENCES public.maderoh_clients(id),
 folio text NOT NULL UNIQUE CHECK (length(folio) BETWEEN 1 AND 80),
 snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
 creation_fingerprint text NOT NULL CHECK (creation_fingerprint ~ '^[a-f0-9]{64}$'),
 total_centavos bigint NOT NULL CHECK (total_centavos BETWEEN 1 AND 1000000000000),
 deposit_target_centavos bigint NOT NULL CHECK (deposit_target_centavos>=0 AND deposit_target_centavos<=total_centavos),
 state text NOT NULL DEFAULT 'pendiente_anticipo' CHECK (state IN ('pendiente_anticipo','confirmado','en_produccion','listo','entregado','cancelado')),
 delivery_date date,
 notes text NOT NULL DEFAULT '' CHECK (length(notes)<=5000),
 revision bigint NOT NULL DEFAULT 0 CHECK (revision>=0),
 created_by text NOT NULL CHECK (length(created_by) BETWEEN 3 AND 40),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(snapshot ? 'id' AND snapshot ? 'folio' AND jsonb_typeof(snapshot->'id')='string' AND jsonb_typeof(snapshot->'folio')='string' AND snapshot->>'id'=id::text AND snapshot->>'folio'=folio)
);
CREATE INDEX maderoh_orders_client_date ON public.maderoh_orders(client_id,created_at DESC);
CREATE INDEX maderoh_orders_date ON public.maderoh_orders(created_at DESC);
CREATE TABLE public.maderoh_order_payments (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES public.maderoh_orders(id),
 amount_centavos bigint NOT NULL CHECK (amount_centavos BETWEEN 1 AND 1000000000000),
 paid_on date NOT NULL,
 method text NOT NULL CHECK (method IN ('transferencia','efectivo','tarjeta','otro')),
 reference text NOT NULL DEFAULT '' CHECK (length(reference)<=180),
 note text NOT NULL DEFAULT '' CHECK (length(note)<=1000),
 creation_fingerprint text NOT NULL CHECK (creation_fingerprint ~ '^[a-f0-9]{64}$'),
 created_by text NOT NULL CHECK (length(created_by) BETWEEN 3 AND 40),
 created_at timestamptz NOT NULL DEFAULT now(),
 voided_at timestamptz,
 voided_by text,
 void_reason text,
 CHECK ((voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL) OR
 (voided_at IS NOT NULL AND voided_by IS NOT NULL AND length(void_reason) BETWEEN 1 AND 1000))
);
CREATE INDEX maderoh_order_payments_order ON public.maderoh_order_payments(order_id,created_at);
CREATE FUNCTION public.maderoh_preserve_order()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Los pedidos se cancelan; no se eliminan.' USING ERRCODE='23514'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
 OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.folio IS DISTINCT FROM OLD.folio
 OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.total_centavos IS DISTINCT FROM OLD.total_centavos
 OR NEW.deposit_target_centavos IS DISTINCT FROM OLD.deposit_target_centavos
 OR NEW.creation_fingerprint IS DISTINCT FROM OLD.creation_fingerprint
 OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
  RAISE EXCEPTION 'El acuerdo original del pedido se conserva.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER maderoh_order_guard BEFORE UPDATE OR DELETE ON public.maderoh_orders FOR EACH ROW EXECUTE FUNCTION public.maderoh_preserve_order();
CREATE FUNCTION public.maderoh_preserve_payment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Los registros de pago se anulan; no se eliminan.' USING ERRCODE='23514'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.order_id IS DISTINCT FROM OLD.order_id
 OR NEW.amount_centavos IS DISTINCT FROM OLD.amount_centavos OR NEW.paid_on IS DISTINCT FROM OLD.paid_on
 OR NEW.method IS DISTINCT FROM OLD.method OR NEW.reference IS DISTINCT FROM OLD.reference
 OR NEW.note IS DISTINCT FROM OLD.note OR NEW.creation_fingerprint IS DISTINCT FROM OLD.creation_fingerprint
 OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
 OR (OLD.voided_at IS NOT NULL AND (NEW.voided_at IS DISTINCT FROM OLD.voided_at
 OR NEW.voided_by IS DISTINCT FROM OLD.voided_by OR NEW.void_reason IS DISTINCT FROM OLD.void_reason)) THEN
  RAISE EXCEPTION 'El registro original del pago se conserva; anula el registro si hubo un error.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER maderoh_payment_guard BEFORE UPDATE OR DELETE ON public.maderoh_order_payments FOR EACH ROW EXECUTE FUNCTION public.maderoh_preserve_payment();
REVOKE ALL ON TABLE public.maderoh_clients,public.maderoh_orders,public.maderoh_order_payments FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maderoh_preserve_order() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maderoh_preserve_payment() FROM PUBLIC;
INSERT INTO public.maderoh_migrations(version) VALUES(3);
