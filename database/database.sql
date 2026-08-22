-- =========================================================
-- MADERÓH WEB
-- BASE DE DATOS PRINCIPAL
-- =========================================================


-- =========================================================
-- 1. PRODUCTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS products (

    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(120)
        NOT NULL,

    slug VARCHAR(140)
        NOT NULL
        UNIQUE,

    category VARCHAR(60)
        NOT NULL,

    category_name VARCHAR(80)
        NOT NULL,

    description VARCHAR(500),

    price NUMERIC(12,2),

    currency VARCHAR(3)
        NOT NULL
        DEFAULT 'MXN',

    measurements VARCHAR(150),

    width_cm NUMERIC(10,2),

    depth_cm NUMERIC(10,2),

    height_cm NUMERIC(10,2),

    finish VARCHAR(150),

    main_image_url TEXT,

    featured BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT products_price_check

        CHECK (
            price IS NULL
            OR price >= 0
        ),


    CONSTRAINT products_currency_check

        CHECK (
            currency IN (
                'MXN',
                'USD'
            )
        )

);


-- =========================================================
-- 2. IMÁGENES DE PRODUCTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS product_images (

    id BIGSERIAL PRIMARY KEY,

    product_id BIGINT
        NOT NULL,

    image_url TEXT
        NOT NULL,

    alt_text VARCHAR(200),

    position INTEGER
        NOT NULL
        DEFAULT 0,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT product_images_product_fk

        FOREIGN KEY (
            product_id
        )

        REFERENCES products(id)

        ON DELETE CASCADE,


    CONSTRAINT product_images_position_check

        CHECK (
            position >= 0
        )

);


-- =========================================================
-- 3. ANALYTICS
-- =========================================================

CREATE TABLE IF NOT EXISTS web_events (

    id BIGSERIAL PRIMARY KEY,

    event_name VARCHAR(100)
        NOT NULL,

    page VARCHAR(200),

    referrer VARCHAR(500),

    event_data JSONB
        NOT NULL
        DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP

);


-- =========================================================
-- 4. COTIZACIONES
-- =========================================================

CREATE TABLE IF NOT EXISTS quotes (

    id BIGSERIAL PRIMARY KEY,

    project_type VARCHAR(30),

    product VARCHAR(120)
        NOT NULL,

    width_cm NUMERIC(10,2),

    depth_cm NUMERIC(10,2),

    height_cm NUMERIC(10,2),

    finish VARCHAR(150),

    structure_color VARCHAR(150),

    quantity INTEGER
        NOT NULL
        DEFAULT 1,

    business_type VARCHAR(100),

    space_size_m2 NUMERIC(10,2),

    comments VARCHAR(700),

    status VARCHAR(30)
        NOT NULL
        DEFAULT 'new',

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT quotes_quantity_check

        CHECK (
            quantity >= 1
            AND quantity <= 500
        )

);


-- =========================================================
-- 5. USUARIOS ADMINISTRATIVOS
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_users (

    id BIGSERIAL PRIMARY KEY,

    email VARCHAR(255)
        NOT NULL
        UNIQUE,

    password_hash TEXT
        NOT NULL,

    role VARCHAR(30)
        NOT NULL
        DEFAULT 'OWNER',

    active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT admin_users_role_check

        CHECK (
            role IN (
                'OWNER',
                'ADMIN'
            )
        )

);


-- =========================================================
-- 6. AUDITORÍA ADMINISTRATIVA
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (

    id BIGSERIAL PRIMARY KEY,

    admin_user_id BIGINT,

    action VARCHAR(80)
        NOT NULL,

    entity_type VARCHAR(80)
        NOT NULL,

    entity_id BIGINT,

    old_data JSONB,

    new_data JSONB,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT admin_audit_user_fk

        FOREIGN KEY (
            admin_user_id
        )

        REFERENCES admin_users(id)

        ON DELETE SET NULL

);


-- =========================================================
-- 7. ÍNDICES DE PRODUCTOS
-- =========================================================

CREATE INDEX IF NOT EXISTS
idx_products_category
ON products(category);


CREATE INDEX IF NOT EXISTS
idx_products_active
ON products(active);


CREATE INDEX IF NOT EXISTS
idx_products_featured
ON products(featured);


CREATE INDEX IF NOT EXISTS
idx_products_created_at
ON products(created_at);


CREATE INDEX IF NOT EXISTS
idx_product_images_product
ON product_images(product_id);


-- =========================================================
-- 8. ÍNDICES ANALYTICS
-- =========================================================

CREATE INDEX IF NOT EXISTS
idx_web_events_created_at
ON web_events(created_at);


CREATE INDEX IF NOT EXISTS
idx_web_events_event_name
ON web_events(event_name);


-- =========================================================
-- 9. ÍNDICES COTIZACIONES
-- =========================================================

CREATE INDEX IF NOT EXISTS
idx_quotes_created_at
ON quotes(created_at);


CREATE INDEX IF NOT EXISTS
idx_quotes_status
ON quotes(status);


-- =========================================================
-- 10. ÍNDICES AUDITORÍA
-- =========================================================

CREATE INDEX IF NOT EXISTS
idx_admin_audit_created_at
ON admin_audit_log(created_at);


CREATE INDEX IF NOT EXISTS
idx_admin_audit_user
ON admin_audit_log(admin_user_id);


-- =========================================================
-- 11. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE products
ENABLE ROW LEVEL SECURITY;


ALTER TABLE product_images
ENABLE ROW LEVEL SECURITY;


ALTER TABLE web_events
ENABLE ROW LEVEL SECURITY;


ALTER TABLE quotes
ENABLE ROW LEVEL SECURITY;


ALTER TABLE admin_users
ENABLE ROW LEVEL SECURITY;


ALTER TABLE admin_audit_log
ENABLE ROW LEVEL SECURITY;