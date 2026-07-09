--
-- PostgreSQL database dump
--

\restrict iS4aVqo09BiWDx7CaO7adyypVwG8YvK7B3WdlaMAoFfxooEVKgUst2sn0hosorT

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bitrix_field_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bitrix_field_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_field text NOT NULL,
    bitrix_object text NOT NULL,
    bitrix_field text NOT NULL,
    CONSTRAINT bitrix_field_mappings_bitrix_object_check CHECK ((bitrix_object = ANY (ARRAY['deal'::text, 'company'::text, 'contact'::text])))
);


ALTER TABLE public.bitrix_field_mappings OWNER TO postgres;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_code text,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.brands OWNER TO postgres;

--
-- Name: bundle_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bundle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bundle_variant_id uuid NOT NULL,
    item_variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    CONSTRAINT bundle_items_check CHECK ((bundle_variant_id <> item_variant_id)),
    CONSTRAINT bundle_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.bundle_items OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    short_code text
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    tax_code text,
    country character(2) DEFAULT 'VN'::bpchar NOT NULL,
    address text,
    phone text,
    email text,
    bank_account text,
    bank_name text,
    bitrix_company_id text,
    is_active boolean DEFAULT true NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: company_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    type text NOT NULL,
    CONSTRAINT company_types_type_check CHECK ((type = ANY (ARRAY['customer'::text, 'supplier'::text])))
);


ALTER TABLE public.company_types OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    full_name text NOT NULL,
    "position" text,
    phone text,
    email text,
    is_primary boolean DEFAULT false NOT NULL,
    bitrix_contact_id text,
    note text
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: custom_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_name text NOT NULL,
    field_label text NOT NULL,
    field_type text NOT NULL,
    object_type text NOT NULL,
    options jsonb,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    applies_to_po_line boolean DEFAULT false NOT NULL,
    CONSTRAINT custom_fields_field_type_check CHECK ((field_type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'boolean'::text]))),
    CONSTRAINT custom_fields_object_type_check CHECK ((object_type = ANY (ARRAY['quotation'::text, 'receipt'::text, 'delivery_order'::text, 'purchase_order'::text, 'transfer_order'::text, 'stocktake'::text, 'product'::text, 'variant'::text, 'company'::text])))
);


ALTER TABLE public.custom_fields OWNER TO postgres;

--
-- Name: delivery_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_order_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    bundle_id uuid,
    quotation_line_item_id uuid,
    line_order integer DEFAULT 0 NOT NULL,
    note text,
    customer_warranty_start timestamp with time zone,
    bundle_unit_qty integer,
    CONSTRAINT delivery_order_lines_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.delivery_order_lines OWNER TO postgres;

--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    export_type text NOT NULL,
    company_id uuid,
    contact_id uuid,
    warehouse_id uuid NOT NULL,
    quotation_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    reason text,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ref_document_type text,
    ref_document_id uuid,
    CONSTRAINT delivery_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.delivery_orders OWNER TO postgres;

--
-- Name: document_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_sequences (
    doc_type character varying(20) NOT NULL,
    year integer NOT NULL,
    last_seq integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.document_sequences OWNER TO postgres;

--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    object_type text NOT NULL,
    file_path text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT document_templates_object_type_check CHECK ((object_type = ANY (ARRAY['quotation'::text, 'receipt'::text, 'delivery_order'::text])))
);


ALTER TABLE public.document_templates OWNER TO postgres;

--
-- Name: export_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.export_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    parent_key text,
    is_system boolean DEFAULT false NOT NULL,
    requires_company text DEFAULT 'none'::text NOT NULL,
    requires_quotation boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT export_types_requires_company_check CHECK ((requires_company = ANY (ARRAY['supplier'::text, 'customer'::text, 'none'::text])))
);


ALTER TABLE public.export_types OWNER TO postgres;

--
-- Name: field_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    object_type text NOT NULL,
    object_id uuid NOT NULL,
    field_id uuid NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.field_values OWNER TO postgres;

--
-- Name: import_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    parent_key text,
    is_system boolean DEFAULT false NOT NULL,
    requires_company text DEFAULT 'none'::text NOT NULL,
    requires_ref_document text DEFAULT 'none'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT import_types_requires_company_check CHECK ((requires_company = ANY (ARRAY['supplier'::text, 'customer'::text, 'none'::text]))),
    CONSTRAINT import_types_requires_ref_document_check CHECK ((requires_ref_document = ANY (ARRAY['quotation'::text, 'stocktake_result'::text, 'none'::text])))
);


ALTER TABLE public.import_types OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    qty_on_hand integer DEFAULT 0 NOT NULL,
    qty_reserved integer DEFAULT 0 NOT NULL,
    avg_cost numeric(15,2),
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_qty_on_hand CHECK ((qty_on_hand >= 0)),
    CONSTRAINT chk_qty_reserved CHECK ((qty_reserved >= 0))
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_id_seq OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    description text,
    "group" text
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_en text,
    model_number text,
    category_id uuid,
    product_type text NOT NULL,
    description text,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    brand_id uuid,
    CONSTRAINT products_product_type_check CHECK ((product_type = ANY (ARRAY['storable'::text, 'consumable'::text, 'service'::text, 'bundle'::text])))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: purchase_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    manufacturer_warranty_months integer,
    line_order integer DEFAULT 0 NOT NULL,
    note text,
    customer_warranty_months integer,
    CONSTRAINT purchase_order_lines_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.purchase_order_lines OWNER TO postgres;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    company_id uuid NOT NULL,
    contact_id uuid,
    bitrix_deal_id text,
    status text DEFAULT 'draft'::text NOT NULL,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'cancelled'::text])))
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: quotation_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotation_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_id uuid NOT NULL,
    section_id uuid NOT NULL,
    variant_id uuid,
    bundle_id uuid,
    description text,
    unit text,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) DEFAULT 0 NOT NULL,
    warranty text,
    line_total numeric(15,2) DEFAULT 0 NOT NULL,
    vat_percent numeric(5,2) DEFAULT 0 NOT NULL,
    vat_amount numeric(15,2) DEFAULT 0 NOT NULL,
    is_reserved boolean DEFAULT true NOT NULL,
    line_order integer DEFAULT 0 NOT NULL,
    note text
);


ALTER TABLE public.quotation_line_items OWNER TO postgres;

--
-- Name: quotation_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotation_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_id uuid NOT NULL,
    name text NOT NULL,
    section_order integer DEFAULT 0 NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.quotation_sections OWNER TO postgres;

--
-- Name: quotations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    company_id uuid NOT NULL,
    contact_id uuid,
    project_name text,
    delivery_location text,
    warehouse_id uuid,
    valid_days integer,
    expired_at date,
    bitrix_deal_id text,
    bitrix_deal_url text,
    bitrix_synced_at timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    vat_total numeric(15,2) DEFAULT 0 NOT NULL,
    discount numeric(15,2) DEFAULT 0 NOT NULL,
    grand_total numeric(15,2) DEFAULT 0 NOT NULL,
    amount_in_words text,
    terms text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quotations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'expired'::text, 'cancelled'::text])))
);


ALTER TABLE public.quotations OWNER TO postgres;

--
-- Name: receipt_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipt_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    cost_price numeric(15,2) NOT NULL,
    line_order integer DEFAULT 0 NOT NULL,
    note text,
    qty_remaining integer,
    po_line_id uuid,
    manufacturer_warranty_months integer,
    customer_warranty_months integer,
    manufacturer_warranty_start timestamp with time zone,
    CONSTRAINT receipt_lines_qty_remaining_check CHECK (((qty_remaining IS NULL) OR ((qty_remaining >= 0) AND (qty_remaining <= quantity)))),
    CONSTRAINT receipt_lines_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.receipt_lines OWNER TO postgres;

--
-- Name: receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    import_type text NOT NULL,
    company_id uuid,
    contact_id uuid,
    warehouse_id uuid NOT NULL,
    ref_document_type text,
    ref_document_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    po_id uuid,
    CONSTRAINT receipts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.receipts OWNER TO postgres;

--
-- Name: reserved_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reserved_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    quantity integer NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    quotation_line_item_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reserved_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT reserved_items_source_type_check CHECK ((source_type = ANY (ARRAY['quotation'::text, 'delivery_order'::text])))
);


ALTER TABLE public.reserved_items OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: serial_numbers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.serial_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    serial_no text NOT NULL,
    variant_id uuid NOT NULL,
    warehouse_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    receipt_line_id uuid,
    delivery_line_id uuid,
    mac_address text,
    manufacturer_warranty_end timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_warranty_end timestamp with time zone,
    CONSTRAINT serial_numbers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'sold'::text, 'disposed'::text])))
);


ALTER TABLE public.serial_numbers OWNER TO postgres;

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    serial_id uuid,
    movement_type text NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(15,2),
    ref_document_type text,
    ref_document_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['in'::text, 'out'::text]))),
    CONSTRAINT stock_movements_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.stock_movements OWNER TO postgres;

--
-- Name: stocktake_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktake_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stocktake_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    qty_system integer DEFAULT 0 NOT NULL,
    qty_actual integer,
    difference integer GENERATED ALWAYS AS (
CASE
    WHEN (qty_actual IS NOT NULL) THEN (qty_actual - qty_system)
    ELSE NULL::integer
END) STORED
);


ALTER TABLE public.stocktake_lines OWNER TO postgres;

--
-- Name: stocktake_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktake_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stocktake_id uuid NOT NULL,
    total_sku integer DEFAULT 0 NOT NULL,
    matched integer DEFAULT 0 NOT NULL,
    shortage integer DEFAULT 0 NOT NULL,
    surplus integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    note text
);


ALTER TABLE public.stocktake_results OWNER TO postgres;

--
-- Name: stocktake_serials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktake_serials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stocktake_id uuid NOT NULL,
    serial_id uuid NOT NULL,
    status text NOT NULL,
    CONSTRAINT stocktake_serials_status_check CHECK ((status = ANY (ARRAY['found'::text, 'missing'::text, 'unexpected'::text])))
);


ALTER TABLE public.stocktake_serials OWNER TO postgres;

--
-- Name: stocktakes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktakes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    warehouse_id uuid NOT NULL,
    scope_type text DEFAULT 'all'::text NOT NULL,
    scope_ids jsonb,
    status text DEFAULT 'in_progress'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_by uuid NOT NULL,
    note text,
    CONSTRAINT stocktakes_scope_type_check CHECK ((scope_type = ANY (ARRAY['all'::text, 'by_sku'::text, 'by_category'::text]))),
    CONSTRAINT stocktakes_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.stocktakes OWNER TO postgres;

--
-- Name: template_field_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_field_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    template_variable text NOT NULL,
    source_type text NOT NULL,
    database_field text,
    bitrix_field text,
    is_required boolean DEFAULT false NOT NULL,
    CONSTRAINT template_field_mappings_source_type_check CHECK ((source_type = ANY (ARRAY['database'::text, 'bitrix'::text])))
);


ALTER TABLE public.template_field_mappings OWNER TO postgres;

--
-- Name: transfer_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfer_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_order_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    line_order integer DEFAULT 0 NOT NULL,
    note text,
    CONSTRAINT transfer_order_lines_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.transfer_order_lines OWNER TO postgres;

--
-- Name: transfer_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfer_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    transfer_type text NOT NULL,
    from_warehouse_id uuid NOT NULL,
    to_warehouse_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transfer_orders_check CHECK ((from_warehouse_id <> to_warehouse_id)),
    CONSTRAINT transfer_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT transfer_orders_transfer_type_check CHECK ((transfer_type = ANY (ARRAY['transfer'::text, 'warranty_in'::text, 'demo_in'::text, 'qc_pass'::text, 'sn_ready'::text])))
);


ALTER TABLE public.transfer_orders OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    role_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: variant_attribute_def_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_attribute_def_products (
    attribute_def_id uuid NOT NULL,
    product_id uuid NOT NULL
);


ALTER TABLE public.variant_attribute_def_products OWNER TO postgres;

--
-- Name: variant_attribute_defs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_attribute_defs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    unit character varying(255),
    options text[] DEFAULT '{}'::text[] NOT NULL,
    applies_to text DEFAULT 'all'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    field_type text DEFAULT 'select'::text NOT NULL,
    CONSTRAINT variant_attribute_defs_applies_to_check CHECK ((applies_to = ANY (ARRAY['all'::text, 'product'::text])))
);


ALTER TABLE public.variant_attribute_defs OWNER TO postgres;

--
-- Name: variant_attribute_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_attribute_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    attribute_def_id uuid NOT NULL,
    value character varying(255),
    include_in_sku boolean DEFAULT false NOT NULL
);


ALTER TABLE public.variant_attribute_values OWNER TO postgres;

--
-- Name: variant_suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    supplier_sku text,
    supplier_price numeric(15,2),
    lead_time_days integer,
    is_preferred boolean DEFAULT false NOT NULL
);


ALTER TABLE public.variant_suppliers OWNER TO postgres;

--
-- Name: variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    unit text DEFAULT 'Cái'::text NOT NULL,
    cost_price numeric(15,2),
    sale_price numeric(15,2),
    currency character(3) DEFAULT 'VND'::bpchar NOT NULL,
    weight_kg numeric(8,3),
    warranty_months integer,
    reorder_point integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.variants OWNER TO postgres;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    address text,
    description text,
    manager_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT warehouses_type_check CHECK ((type = ANY (ARRAY['physical'::text, 'virtual'::text])))
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Data for Name: bitrix_field_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bitrix_field_mappings (id, quotation_field, bitrix_object, bitrix_field) FROM stdin;
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.brands (id, name, short_code, is_active) FROM stdin;
2b083570-8b87-4f59-9fc9-7aff0fcbec3b	Sam Sung	SS	t
6e2fa51d-4ead-48de-a6ed-d9ea47edae4f	Huawei 	HW	t
9e43c001-6391-411e-acb4-99d637bc2701	Cisco	CSC	t
02a0ee61-3639-440c-999a-eb54535e3c73	Intel	IT	t
3f1632fc-0c70-4e6a-8069-8d2cbd06dae7	Kingston	KS	t
7bc73a67-0a5c-4f58-8800-df728895d833	Lenovo	LNV	t
ae6258f9-2b75-4f70-aaa3-e4e96e3a4e9c	Panasonic	PNSN	t
a6f7df98-41c3-403f-b004-7292a1e9d2c1	Cisco_WF	CSW	t
6771a4a5-c2d2-4886-9842-7fc9aca09eaf	Cisco WF	CWF	t
\.


--
-- Data for Name: bundle_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bundle_items (id, bundle_variant_id, item_variant_id, quantity) FROM stdin;
6c6f1862-84d5-443a-aa74-006ad14fcaa4	9aa71322-6daa-4446-85fc-7e6eee902cfd	c24ef883-9913-4e81-9125-e6e0d454fe48	1
9a44e443-060b-453d-b016-3de2742d26fe	9aa71322-6daa-4446-85fc-7e6eee902cfd	a262e290-3061-40fd-83e5-56671e1b0325	2
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, parent_id, is_active, short_code) FROM stdin;
2f941d9c-b3a6-425f-ba8d-85368f3c105e	RAM	\N	t	RAM
6abcb67c-5083-42d1-be48-ddcf9c170e29	SWITCH	\N	t	SW
a46ae9b7-0b72-422c-921c-4b231e2c2bc8	ROUTER	\N	t	RT
8aa417e9-1bcd-4154-b2bf-a322d021b379	CAMERA	\N	t	CAM
c34a2167-0cdb-413a-8241-873da1fe90c4	Switch_WF	\N	t	SWW
7e82c608-533a-4189-a431-7dfac1dd9ba6	Network Switch WF	\N	t	NSW
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, code, name, tax_code, country, address, phone, email, bank_account, bank_name, bitrix_company_id, is_active, note, created_at, updated_at) FROM stdin;
7d629756-7700-49bb-92ba-02e5859ea9be	CTY-0001	Công ty Test Auto Code	\N	VN	\N	\N	\N	\N	\N	\N	t	\N	2026-06-29 02:37:01.517267+00	2026-06-29 02:37:01.517267+00
334c4c60-344e-4884-89d2-50e7d7e28d3e	1	Mstar		VN							t		2026-06-25 06:50:26.867964+00	2026-06-29 02:48:03.867661+00
de8586da-2c1b-418d-8395-2adaa7980b6b	CTY-0002	Cisco Distributor VN	\N	VN	\N	\N	\N	\N	\N	\N	t	\N	2026-07-01 03:16:08.48664+00	2026-07-01 03:16:08.48664+00
\.


--
-- Data for Name: company_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_types (id, company_id, type) FROM stdin;
838d5590-b740-4923-bb0c-cea8ddd040a2	7d629756-7700-49bb-92ba-02e5859ea9be	supplier
856bfec4-61f6-40ae-a6ef-36ebd2974a05	334c4c60-344e-4884-89d2-50e7d7e28d3e	supplier
ee03fd67-438a-4fe4-b1c9-f46fb4834746	334c4c60-344e-4884-89d2-50e7d7e28d3e	customer
0922ea79-ff2f-4c8d-a4d3-84edd1afc919	de8586da-2c1b-418d-8395-2adaa7980b6b	supplier
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, company_id, full_name, "position", phone, email, is_primary, bitrix_contact_id, note) FROM stdin;
b015d4db-821a-4254-bd65-de83a74318d4	7d629756-7700-49bb-92ba-02e5859ea9be	Test Contact	\N	0909123456	\N	f	\N	\N
1e4593ce-24b7-4624-ba50-442abbf87c88	334c4c60-344e-4884-89d2-50e7d7e28d3e	Khai Nguyen dns.khainq	IT	\N	quockhai250703@gmail.com	f	\N	\N
\.


--
-- Data for Name: custom_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_fields (id, field_name, field_label, field_type, object_type, options, is_system, is_active, sort_order, applies_to_po_line) FROM stdin;
\.


--
-- Data for Name: delivery_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_order_lines (id, delivery_order_id, variant_id, quantity, bundle_id, quotation_line_item_id, line_order, note, customer_warranty_start, bundle_unit_qty) FROM stdin;
39c84959-5724-4c28-b816-952041914349	4b5d1aa8-b5a8-4b1b-9fc0-c08b36f992d5	803a93f4-3dff-4d60-b448-094e08e9fac4	5	\N	\N	1	\N	\N	\N
a503bfdb-504d-4b0c-8bca-6a8d82a970a7	7dff023a-e8e3-4135-a365-3d461168ad39	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	\N	\N	1	\N	\N	\N
eb4a5e8c-1121-498e-bf4a-0d7071aa3735	9883eea9-3c80-4030-9c74-1b34827e12e2	803a93f4-3dff-4d60-b448-094e08e9fac4	1	\N	\N	1	\N	\N	\N
c0c0addf-821a-4baf-b13b-d9a17d08e2c3	cd73be5c-b29c-4f72-9d5f-12c059d927f5	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	1	\N	\N	1	\N	2026-06-30 17:00:00+00	\N
b71fb230-761c-4791-818e-737c05f5a4f7	0e7fc332-369c-451a-a045-38b5155a6e84	c24ef883-9913-4e81-9125-e6e0d454fe48	2	\N	7f90ef2a-1982-4406-98a6-174349b05445	1	\N	\N	\N
b7df6896-664a-4f9f-bb91-8ec19b5457c5	0e7fc332-369c-451a-a045-38b5155a6e84	a262e290-3061-40fd-83e5-56671e1b0325	10	\N	96bb38fe-7492-484b-85ff-49eccb001ad7	2	\N	\N	\N
5fe85a17-237c-444e-9849-b6a8c0ecc943	3f8527be-ebf4-4b0c-98f8-8adcc94d111a	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	7f90ef2a-1982-4406-98a6-174349b05445	1	\N	\N	\N
9297ef16-51ae-4e48-8967-67ca1eaaf456	17861ccc-0149-4774-bb1f-a05cef112e98	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
2f79f887-3b9e-4d37-8cc7-6ad9bf714dfc	1402bcef-34b6-444e-9c7a-fe6d2c3520b8	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
fef3884c-9141-4d8c-bb32-58387f04fae6	d3ef9760-e9a7-4c6b-a40f-f3e4fead7c29	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
0e1489e6-8c18-4375-a7c1-a9ca084f3a6a	d720ddae-4dfb-4ff5-b05a-120ee35eef1c	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
b47dfa59-2305-49f2-927e-1d464b058777	36090ced-85c2-49be-81ed-ea8ca9ccb7f9	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
ed54155d-56d8-47d4-91fc-0474e3f5a548	40a24905-d44b-4b0f-b83a-b13fc5a86a51	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
b08bc920-b39e-4b7d-b07e-76598b7384fb	90c91881-2fb7-4371-bc42-8a521d845018	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
81c6f523-5af3-4b7a-bb0c-19d36ba9c421	5d8fb8a7-dbf1-493e-bf63-73173c67ee43	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
bafa0a9f-264d-451e-9181-aa6f047a4c98	cda0d71c-5d64-4cd7-8099-24068c56be65	c24ef883-9913-4e81-9125-e6e0d454fe48	1	\N	\N	1	\N	\N	\N
cdb65d16-93a4-4480-9971-1bc5cb6ad2d2	9e312a88-3f1d-4839-9e04-9a5041c56dca	c24ef883-9913-4e81-9125-e6e0d454fe48	1	9aa71322-6daa-4446-85fc-7e6eee902cfd	08b3d726-c2d0-4881-8133-10ec419fe944	1	\N	\N	1
6e45f6e8-4dd9-4b7f-b90e-01b788cbabc1	9e312a88-3f1d-4839-9e04-9a5041c56dca	a262e290-3061-40fd-83e5-56671e1b0325	2	9aa71322-6daa-4446-85fc-7e6eee902cfd	08b3d726-c2d0-4881-8133-10ec419fe944	2	\N	\N	1
f23940f3-9229-452c-82a8-0fc8f6bef8fa	1bad3326-6c02-42f5-951f-1dd1ee633959	c24ef883-9913-4e81-9125-e6e0d454fe48	1	9aa71322-6daa-4446-85fc-7e6eee902cfd	08b3d726-c2d0-4881-8133-10ec419fe944	1	\N	\N	1
e36b5631-2663-4ae2-bd80-cd732dc9d353	1bad3326-6c02-42f5-951f-1dd1ee633959	a262e290-3061-40fd-83e5-56671e1b0325	2	9aa71322-6daa-4446-85fc-7e6eee902cfd	08b3d726-c2d0-4881-8133-10ec419fe944	2	\N	\N	1
\.


--
-- Data for Name: delivery_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_orders (id, code, export_type, company_id, contact_id, warehouse_id, quotation_id, status, approved_by, approved_at, completed_at, reason, note, created_by, created_at, updated_at, ref_document_type, ref_document_id) FROM stdin;
4b5d1aa8-b5a8-4b1b-9fc0-c08b36f992d5	XK-2026-0001	sale	334c4c60-344e-4884-89d2-50e7d7e28d3e	1e4593ce-24b7-4624-ba50-442abbf87c88	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	cancelled	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:28:08.501692+00	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:28:04.848799+00	2026-06-29 03:38:16.910388+00	\N	\N
17861ccc-0149-4774-bb1f-a05cef112e98	XK-2026-0007	demo_out	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	draft	\N	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:42.257274+00	2026-07-08 06:45:42.257274+00	\N	\N
7dff023a-e8e3-4135-a365-3d461168ad39	XK-2026-0002	sale	334c4c60-344e-4884-89d2-50e7d7e28d3e	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:39:40.038894+00	2026-06-29 04:07:21.043845+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:39:36.064056+00	2026-06-29 04:07:21.043845+00	\N	\N
9883eea9-3c80-4030-9c74-1b34827e12e2	XK-2026-0003	sale	334c4c60-344e-4884-89d2-50e7d7e28d3e	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 07:04:39.635609+00	2026-06-29 07:04:46.538003+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 07:04:36.061545+00	2026-06-29 07:04:46.538003+00	\N	\N
cd73be5c-b29c-4f72-9d5f-12c059d927f5	XK-2026-0004	sale	334c4c60-344e-4884-89d2-50e7d7e28d3e	1e4593ce-24b7-4624-ba50-442abbf87c88	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	draft	\N	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 08:03:37.431349+00	2026-06-30 08:03:37.431349+00	\N	\N
0e7fc332-369c-451a-a045-38b5155a6e84	XK-2026-0005	sale	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	completed	\N	\N	2026-07-08 04:03:04.948014+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:02:47.373223+00	2026-07-08 04:03:04.948014+00	\N	\N
3f8527be-ebf4-4b0c-98f8-8adcc94d111a	XK-2026-0006	sale	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	completed	\N	\N	2026-07-08 04:03:34.042018+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:03:34.012388+00	2026-07-08 04:03:34.042018+00	\N	\N
1402bcef-34b6-444e-9c7a-fe6d2c3520b8	XK-2026-0008	demo_out	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	draft	\N	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:46:05.44056+00	2026-07-08 06:46:05.44056+00	\N	\N
d3ef9760-e9a7-4c6b-a40f-f3e4fead7c29	XK-2026-0009	demo_out	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	\N	\N	2026-07-08 06:47:53.150124+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:47:53.124894+00	2026-07-08 06:47:53.150124+00	\N	\N
d720ddae-4dfb-4ff5-b05a-120ee35eef1c	XK-2026-0010	dispose	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	\N	\N	2026-07-08 06:47:53.343935+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:47:53.310619+00	2026-07-08 06:47:53.343935+00	\N	\N
36090ced-85c2-49be-81ed-ea8ca9ccb7f9	XK-2026-0011	return_out	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	\N	\N	2026-07-08 06:47:53.438266+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:47:53.41971+00	2026-07-08 06:47:53.438266+00	\N	\N
40a24905-d44b-4b0f-b83a-b13fc5a86a51	XK-2026-0012	warranty_out	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	\N	\N	2026-07-08 06:49:02.953722+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:49:02.924041+00	2026-07-08 06:49:02.953722+00	\N	\N
90c91881-2fb7-4371-bc42-8a521d845018	XK-2026-0013	warranty_out	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	\N	\N	2026-07-08 06:51:17.48428+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:17.437144+00	2026-07-08 06:51:17.48428+00	\N	\N
5d8fb8a7-dbf1-493e-bf63-73173c67ee43	XK-2026-0014	internal	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	\N	\N	2026-07-08 06:51:33.38011+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:33.341678+00	2026-07-08 06:51:33.38011+00	\N	\N
cda0d71c-5d64-4cd7-8099-24068c56be65	XK-2026-0015	demo_out	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	completed	\N	\N	2026-07-08 06:52:02.110183+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:52:02.07426+00	2026-07-08 06:52:02.110183+00	\N	\N
9e312a88-3f1d-4839-9e04-9a5041c56dca	XK-2026-0016	sale	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	c3b6b460-0c16-4b41-9b0d-271c82f9331c	completed	\N	\N	2026-07-08 08:09:59.625665+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:09:59.503202+00	2026-07-08 08:09:59.625665+00	\N	\N
1bad3326-6c02-42f5-951f-1dd1ee633959	XK-2026-0017	sale	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	c3b6b460-0c16-4b41-9b0d-271c82f9331c	completed	\N	\N	2026-07-08 08:10:25.863682+00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:10:25.82666+00	2026-07-08 08:10:25.863682+00	\N	\N
\.


--
-- Data for Name: document_sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_sequences (doc_type, year, last_seq) FROM stdin;
stocktake	2026	2
receipt	2026	23
delivery_order	2026	17
quotation	2026	7
company	0	2
purchase_order	2026	7
transfer_order	2026	7
\.


--
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_templates (id, name, object_type, file_path, is_default, is_active, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: export_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.export_types (id, key, label, parent_key, is_system, requires_company, requires_quotation, is_active) FROM stdin;
57ed0130-3ad2-48df-a94a-c34bb91605da	sale	Bán hàng	\N	t	customer	f	t
6ea2c6a7-d6c4-4c77-9a89-17706d5f15e0	internal	Xuất nội bộ	\N	t	none	f	t
44c8a77c-7c73-4b9c-acbc-7968087a0592	demo_out	Cho mượn demo	\N	t	customer	f	t
51939c6a-ed90-48f8-8f64-dc3e3c60131d	warranty_out	Gửi bảo hành	\N	t	supplier	f	t
5be4f38d-1acb-4846-8285-ca1df4dfdfb3	return_out	Trả về NCC	\N	t	supplier	f	t
8d4f3cac-8b19-4311-a1da-d919b59e8768	dispose	Huỷ hàng hỏng	\N	t	none	f	t
d610dfbd-8919-414c-a21d-3cecce729436	adjustment	Điều chỉnh tồn kho thiếu	\N	t	none	f	t
\.


--
-- Data for Name: field_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.field_values (id, object_type, object_id, field_id, value, created_at) FROM stdin;
\.


--
-- Data for Name: import_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_types (id, key, label, parent_key, is_system, requires_company, requires_ref_document, is_active) FROM stdin;
c2d3f297-6a13-482f-b24a-ab1a9b0c651c	purchase	Mua hàng	\N	f	supplier	none	t
3d9f9318-7eec-4b0b-b4a5-0deef93cb086	adjustment	Điều chỉnh	adjustment	f	none	none	t
6e53cba0-c1cf-4a8d-a2a8-02843dc3a63a	return_in	Hàng trả lại từ khách	\N	t	customer	quotation	t
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (id, variant_id, warehouse_id, qty_on_hand, qty_reserved, avg_cost, last_updated) FROM stdin;
2a5a2f44-54a1-4ab5-ad12-fa86946d0c29	a262e290-3061-40fd-83e5-56671e1b0325	616e07b2-1060-4e66-8163-22c42e5a7c1d	5	0	15000.00	2026-07-08 06:45:18.93571+00
33925f99-7d2c-4f66-864d-9cd78a725306	c24ef883-9913-4e81-9125-e6e0d454fe48	eed07910-c6a2-4702-bb0a-59d3a47f3bdf	0	0	8437500.00	2026-07-08 06:51:17.601761+00
bbf50acd-0e9c-4e58-a673-f950102a676c	c24ef883-9913-4e81-9125-e6e0d454fe48	5538a379-9cd9-4fb4-9c95-3ce5b201f86d	0	0	8437500.00	2026-07-08 06:52:02.23399+00
a7abff79-c5d2-4216-8455-c07d17198aaa	c24ef883-9913-4e81-9125-e6e0d454fe48	616e07b2-1060-4e66-8163-22c42e5a7c1d	3	0	8437500.00	2026-07-08 06:52:02.23399+00
55d5e1ee-276e-4a43-9a23-600ceb669c45	a262e290-3061-40fd-83e5-56671e1b0325	6e5abfe0-375e-4727-bd9d-4b1ef287b502	51	0	15000.00	2026-07-08 08:10:25.863682+00
f46aaa93-2602-48bf-9988-f2cce6a09fa2	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	5	0	800000.00	2026-06-29 04:07:21.043845+00
2b21aaf9-de35-408d-b900-6c985bf18508	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	5	2	8437500.00	2026-07-08 08:18:10.039465+00
5be53020-dd05-4b95-8b31-f9803487aef8	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	28	0	1754285.71	2026-06-30 06:50:30.82608+00
49554f82-1ca3-43a6-b2cf-ce0ba01a399a	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	5	0	7500000.00	2026-07-01 03:16:08.545213+00
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20260618000000_initial_schema.ts	1	2026-06-19 07:24:40.476+00
2	20260624000000_stock_movements_serial_set_null.ts	2	2026-06-24 07:40:57.825+00
3	20260624010000_custom_fields_add_variant_object_type.ts	3	2026-06-25 08:07:47.003+00
4	20260625000000_custom_fields_add_applies_to_po_line.ts	4	2026-06-25 09:36:14.48+00
5	20260626000000_document_sequences.ts	5	2026-06-26 03:04:15.209+00
6	20260629000000_warranty_split.ts	6	2026-06-29 04:54:34.328+00
7	20260629010000_receipt_line_warranty_start.ts	7	2026-06-29 05:06:18.076+00
8	20260629020000_delivery_line_customer_warranty_start.ts	8	2026-06-29 08:01:14.937+00
9	20260629030000_variant_attribute_defs.ts	9	2026-06-29 09:23:25.904+00
10	20260630000000_variant_attr_field_type.ts	10	2026-06-30 02:44:17.169+00
11	20260707000000_custom_fields_add_more_object_types.ts	11	2026-07-07 07:24:16.083414+00
12	20260708000000_fix_manufacturer_warranty_end_to_timestamptz.ts	12	2026-07-08 03:33:48.417+00
13	20260708010000_seed_virtual_warehouses.ts	13	2026-07-08 06:47:23.677+00
14	20260708020000_seed_return_in_import_type.ts	14	2026-07-08 07:57:20.292+00
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, key, description, "group") FROM stdin;
8b8a6a44-395b-45ac-88eb-2b7897391469	quotation.create	Tạo báo giá	quotation
033b3d7f-f0e9-4a67-9a28-d71d2992adf7	quotation.edit	Sửa báo giá	quotation
654100e3-fbdf-4cef-a105-4f89a0189c63	quotation.confirm	Xác nhận báo giá	quotation
ed60816d-f014-4fc3-bd3f-748a8a53afd8	quotation.view	Xem báo giá	quotation
0f69b104-5dc6-4440-8dcb-48b8f9a9758b	receipt.create	Tạo phiếu nhập kho	receipt
72de3791-82f6-4672-aff4-0c7eeac302e2	receipt.approve	Duyệt phiếu nhập kho	receipt
d21e193d-d2e3-4cd8-9412-2cf711840ae0	receipt.complete	Hoàn thành phiếu nhập kho	receipt
9335f3de-ac3a-4563-9348-035617946c12	receipt.view	Xem phiếu nhập kho	receipt
a04ca1af-97c5-4570-a377-a0813d714af5	delivery.create	Tạo phiếu xuất kho	delivery
c03f5d51-746f-41be-b324-c3515e4de0d8	delivery.approve	Duyệt phiếu xuất kho	delivery
6f6d8aff-b1a6-4283-9065-890f56ca1f63	delivery.complete	Hoàn thành phiếu xuất kho	delivery
57e4f781-1ec8-42e0-995f-e100331df205	delivery.view	Xem phiếu xuất kho	delivery
4c3822ac-321f-474f-bac3-b2c5512e9720	transfer.create	Tạo phiếu chuyển kho	transfer
4a6a92f5-8ff3-41be-80be-0e27950cf738	transfer.approve	Duyệt phiếu chuyển kho	transfer
555fc261-a790-48e1-8954-2dfe9d7eb47c	transfer.complete	Hoàn thành phiếu chuyển kho	transfer
16c72691-2083-47dd-b028-eead78e1b3aa	transfer.view	Xem phiếu chuyển kho	transfer
4a437362-e646-4d01-8ce9-cc5faac913d9	stocktake.create	Tạo kiểm kê	stocktake
a63b6658-3e93-48c8-ae80-bb043638794b	stocktake.complete	Hoàn thành kiểm kê	stocktake
521a5a3c-914f-4640-a86f-37df7708d54d	stocktake.view	Xem kiểm kê	stocktake
1f9f75b9-24c1-4408-84f2-5313ec32e62c	report.inventory	Xem báo cáo tồn kho	report
bf8b1295-d95d-4a73-ba96-a2f9ab341268	report.revenue	Xem báo cáo doanh thu	report
68a29121-e91e-488a-b995-5ba9cb8b48f6	report.view	Xem báo cáo tổng hợp	report
5e6c9701-8e0b-4920-8156-3e94d6114a12	settings.roles	Quản lý role	settings
87a88aad-bbf9-44fd-8192-96f2d8f5f77f	settings.users	Quản lý users	settings
990f0c02-3349-4cec-a14b-0b3365e10ac7	settings.warehouse	Quản lý kho	settings
37cdbf9e-794e-4a5c-a21d-81538ebc2ce8	settings.products	Quản lý sản phẩm	settings
608a078f-c6a3-41a9-b7a5-c7ac286bdb25	purchase_order.create	Tạo đơn mua hàng (PO)	purchase_order
d5647073-4992-4174-88e6-17d271dd10a8	purchase_order.edit	Sửa đơn mua hàng (PO)	purchase_order
72956a2a-f2c4-485a-984e-3017a1806380	purchase_order.confirm	Xác nhận đơn mua hàng (PO)	purchase_order
0e1c3346-6a5e-42df-bbc9-2e244a0dd29f	purchase_order.view	Xem đơn mua hàng (PO)	purchase_order
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, code, name, name_en, model_number, category_id, product_type, description, image_url, is_active, created_at, updated_at, brand_id) FROM stdin;
0a41ef4c-0fa8-4bcf-a9ec-8f231886d176	RAM-KS-3f1632fc-0c70-4e6a-8069-8d2cbd06dae7	RAM kingston 	\N	\N	2f941d9c-b3a6-425f-ba8d-85368f3c105e	storable	\N	\N	f	2026-06-25 07:16:04.944361+00	2026-06-26 08:58:13.166291+00	3f1632fc-0c70-4e6a-8069-8d2cbd06dae7
accd160a-5a06-4f5c-9665-d15303c0f5b1	SW-HW-6abcb67c-5083-42d1-be48-ddcf9c170e29	Switch Huawei	\N	\N	6abcb67c-5083-42d1-be48-ddcf9c170e29	storable	\N	\N	f	2026-06-25 06:52:58.301901+00	2026-06-26 08:58:14.671097+00	6e2fa51d-4ead-48de-a6ed-d9ea47edae4f
7ab3fb88-b001-4ec2-b2dd-49012f23e43b	RAM-KS	RAM kingston 	\N	\N	2f941d9c-b3a6-425f-ba8d-85368f3c105e	storable	\N	\N	t	2026-06-26 09:01:13.060738+00	2026-06-26 09:01:13.060738+00	3f1632fc-0c70-4e6a-8069-8d2cbd06dae7
0896b422-8397-45a1-b7c0-83385e9949fa	CAM-HW	Camera Huawei 	\N	\N	8aa417e9-1bcd-4154-b2bf-a322d021b379	storable	\N	\N	t	2026-06-30 02:22:52.92406+00	2026-06-30 02:22:52.92406+00	6e2fa51d-4ead-48de-a6ed-d9ea47edae4f
6e519e2e-ca7b-4388-8668-fe22d28df77b	NSW-CWF-SG350	Cisco SG350	\N	\N	7e82c608-533a-4189-a431-7dfac1dd9ba6	storable	\N	\N	t	2026-07-01 03:16:08.47102+00	2026-07-01 03:16:08.47102+00	6771a4a5-c2d2-4886-9842-7fc9aca09eaf
bfd8c32d-2515-436e-b1b3-e5bc79b81f4c	CAP-TEST	Cáp mạng Cat6 test	\N	\N	\N	consumable	\N	\N	t	2026-07-08 03:15:42.300335+00	2026-07-08 03:15:42.300335+00	\N
6735ac31-0334-4c13-9276-e15a617f0620	SW-CSC-BDL	Bundle Switch + Cáp	\N	\N	6abcb67c-5083-42d1-be48-ddcf9c170e29	bundle	\N	\N	t	2026-07-08 08:02:42.868784+00	2026-07-08 08:02:42.868784+00	9e43c001-6391-411e-acb4-99d637bc2701
\.


--
-- Data for Name: purchase_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_lines (id, purchase_order_id, variant_id, quantity, unit_price, manufacturer_warranty_months, line_order, note, customer_warranty_months) FROM stdin;
ad8bc6bf-8281-4cb2-8377-911cf98e0fa3	11494a64-b555-4abf-a135-9968ccf70d7a	803a93f4-3dff-4d60-b448-094e08e9fac4	10	1200000.00	24	1	\N	\N
5eaecac0-b792-47d7-b091-e0fbf63c03a6	11494a64-b555-4abf-a135-9968ccf70d7a	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	10	800000.00	24	2	\N	\N
f3fd23ae-b65e-46cb-a255-5885aea49de2	3b2064b0-7469-40ea-890b-6eddc195b88f	803a93f4-3dff-4d60-b448-094e08e9fac4	10	1000000.00	24	1	\N	\N
45df212b-6bcd-441b-b859-9cae4e8b8031	b6782d68-646f-40ed-bbc1-16eb2ee4c45e	803a93f4-3dff-4d60-b448-094e08e9fac4	5	5000000.00	25	1	\N	24
2ccedc68-2d44-4465-9106-3f1f93e45b4b	71929fa0-5e36-4fa8-acf3-215c2c47947a	803a93f4-3dff-4d60-b448-094e08e9fac4	2	1000000.00	24	1	DDD	24
c02903e6-c74c-44fe-874a-47a0da90ea89	71929fa0-5e36-4fa8-acf3-215c2c47947a	803a93f4-3dff-4d60-b448-094e08e9fac4	2	1000000.00	12	2	DDDD	12
0660db73-daa4-4beb-8959-646f256c08a5	274aaec2-6c32-4476-8e6b-a16f22a5b6b4	c24ef883-9913-4e81-9125-e6e0d454fe48	5	8000000.00	36	1	\N	\N
bd9fa67e-d122-40f3-a322-1c32a5b8cb95	c07aeb70-4918-4f0a-9838-266e7487f95e	c24ef883-9913-4e81-9125-e6e0d454fe48	5	8500000.00	12	1	\N	\N
7e0151a3-6aa4-45ff-a238-5890e7b3a0a7	6f94ab04-e507-4f96-917b-8bea928a8f30	c24ef883-9913-4e81-9125-e6e0d454fe48	2	8000000.00	\N	1	\N	\N
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, code, company_id, contact_id, bitrix_deal_id, status, note, created_by, created_at, updated_at) FROM stdin;
11494a64-b555-4abf-a135-9968ccf70d7a	PO-2026-0001	334c4c60-344e-4884-89d2-50e7d7e28d3e	\N	\N	confirmed	\N	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:03:16.415707+00	2026-06-26 09:03:22.960835+00
3b2064b0-7469-40ea-890b-6eddc195b88f	PO-2026-0002	7d629756-7700-49bb-92ba-02e5859ea9be	b015d4db-821a-4254-bd65-de83a74318d4	1234	confirmed	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:21:56.889625+00	2026-06-29 03:22:04.874503+00
b6782d68-646f-40ed-bbc1-16eb2ee4c45e	PO-2026-0003	7d629756-7700-49bb-92ba-02e5859ea9be	b015d4db-821a-4254-bd65-de83a74318d4	\N	confirmed	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:02:57.358529+00	2026-06-29 05:18:31.355722+00
71929fa0-5e36-4fa8-acf3-215c2c47947a	PO-2026-0004	7d629756-7700-49bb-92ba-02e5859ea9be	b015d4db-821a-4254-bd65-de83a74318d4	\N	confirmed	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 06:49:30.047496+00	2026-06-30 06:49:35.551587+00
274aaec2-6c32-4476-8e6b-a16f22a5b6b4	PO-2026-0005	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	confirmed	\N	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.498136+00	2026-07-01 03:16:08.509333+00
c07aeb70-4918-4f0a-9838-266e7487f95e	PO-2026-0006	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	confirmed	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:04:27.160111+00	2026-07-08 03:04:33.187633+00
6f94ab04-e507-4f96-917b-8bea928a8f30	PO-2026-0007	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	cancelled	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:43.16624+00	2026-07-08 03:16:43.201108+00
\.


--
-- Data for Name: quotation_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotation_line_items (id, quotation_id, section_id, variant_id, bundle_id, description, unit, quantity, unit_price, warranty, line_total, vat_percent, vat_amount, is_reserved, line_order, note) FROM stdin;
7f90ef2a-1982-4406-98a6-174349b05445	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	13928ca7-5890-4d5d-a49a-968e6649e3af	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	\N	\N	3.00	12000000.00	12 tháng	36000000.00	10.00	3600000.00	t	1	\N
96bb38fe-7492-484b-85ff-49eccb001ad7	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	13928ca7-5890-4d5d-a49a-968e6649e3af	a262e290-3061-40fd-83e5-56671e1b0325	\N	\N	\N	10.00	50000.00	\N	500000.00	10.00	50000.00	t	2	\N
b23d78f1-4d4a-4607-adcd-ce64f32fffa6	7a72b640-c2ee-44e9-bd01-1947b966ddf6	e50730fc-6d1e-48d3-817d-44607f82a581	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	\N	\N	1.00	5000000.00	\N	5000000.00	0.00	0.00	t	1	\N
a7f87fbe-b65b-4ec3-af3d-15a4c531b825	ac92423d-bbc7-4bd1-bbc7-e50fb848cc80	c5fd2f09-b730-4cd8-8095-aac45590003c	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	\N	\N	5.00	5000000.00	\N	25000000.00	0.00	0.00	t	1	\N
1fe938ff-c7d6-42d8-88e1-96e747122104	c83db7ee-83ac-4ead-a9fb-f27bc5075f5e	5de48546-5d6f-4c0f-a425-4759380736e7	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	\N	\N	2.00	5000000.00	\N	10000000.00	0.00	0.00	t	1	\N
e04d9e9f-44f2-456a-850d-3771604ea08b	a61b6b3f-c1b3-46b4-bc71-ab24799a7c0f	a21ddc7a-5626-4e8c-af89-f14b5d74c519	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	\N	\N	3.00	5000000.00	\N	15000000.00	0.00	0.00	f	1	\N
08b3d726-c2d0-4881-8133-10ec419fe944	c3b6b460-0c16-4b41-9b0d-271c82f9331c	e7475df0-034b-4e91-a18f-99585d677bb3	\N	9aa71322-6daa-4446-85fc-7e6eee902cfd	\N	\N	2.00	12500000.00	\N	25000000.00	0.00	0.00	t	1	\N
82311379-1371-4ed5-8871-5a3bb49e7a7b	564c2932-7a12-4412-8c7a-aa9d6fdd0e94	bd461b29-148a-4bbb-95fe-c6802c29a29d	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	\N	\N	1.00	5000000.00	\N	5000000.00	0.00	0.00	t	1	\N
\.


--
-- Data for Name: quotation_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotation_sections (id, quotation_id, name, section_order, subtotal) FROM stdin;
13928ca7-5890-4d5d-a49a-968e6649e3af	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	Thiết bị	1	40150000.00
e50730fc-6d1e-48d3-817d-44607f82a581	7a72b640-c2ee-44e9-bd01-1947b966ddf6	Test	1	5000000.00
c5fd2f09-b730-4cd8-8095-aac45590003c	ac92423d-bbc7-4bd1-bbc7-e50fb848cc80	Test	1	25000000.00
5de48546-5d6f-4c0f-a425-4759380736e7	c83db7ee-83ac-4ead-a9fb-f27bc5075f5e	Test	1	10000000.00
a21ddc7a-5626-4e8c-af89-f14b5d74c519	a61b6b3f-c1b3-46b4-bc71-ab24799a7c0f	Test	1	15000000.00
e7475df0-034b-4e91-a18f-99585d677bb3	c3b6b460-0c16-4b41-9b0d-271c82f9331c	Gói thiết bị	1	25000000.00
bd461b29-148a-4bbb-95fe-c6802c29a29d	564c2932-7a12-4412-8c7a-aa9d6fdd0e94	S1	1	5000000.00
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotations (id, code, company_id, contact_id, project_name, delivery_location, warehouse_id, valid_days, expired_at, bitrix_deal_id, bitrix_deal_url, bitrix_synced_at, status, subtotal, vat_total, discount, grand_total, amount_in_words, terms, created_by, created_at, updated_at) FROM stdin;
30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	BG-2026-0001	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	Test project Playwright	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	30	2026-08-07	\N	\N	\N	confirmed	36500000.00	3650000.00	500000.00	39650000.00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:01:43.175399+00	2026-07-08 04:02:31.070604+00
ac92423d-bbc7-4bd1-bbc7-e50fb848cc80	BG-2026-0003	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	7	2026-07-15	\N	\N	\N	cancelled	25000000.00	0.00	0.00	25000000.00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:03:56.630634+00	2026-07-08 04:03:56.68064+00
c83db7ee-83ac-4ead-a9fb-f27bc5075f5e	BG-2026-0004	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	1	2026-07-09	\N	\N	\N	expired	10000000.00	0.00	0.00	10000000.00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:04:11.587928+00	2026-07-08 04:04:11.635392+00
a61b6b3f-c1b3-46b4-bc71-ab24799a7c0f	BG-2026-0005	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	7	2026-07-15	\N	\N	\N	cancelled	15000000.00	0.00	0.00	15000000.00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:04:11.662958+00	2026-07-08 04:04:11.708221+00
7a72b640-c2ee-44e9-bd01-1947b966ddf6	BG-2026-0002	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	7	2026-07-15	\N	\N	\N	confirmed	5000000.00	0.00	0.00	5000000.00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:03:56.55866+00	2026-07-08 04:06:37.772697+00
c3b6b460-0c16-4b41-9b0d-271c82f9331c	BG-2026-0006	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	30	2026-08-07	\N	\N	\N	confirmed	25000000.00	0.00	0.00	25000000.00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:03:23.665696+00	2026-07-08 08:03:49.509798+00
564c2932-7a12-4412-8c7a-aa9d6fdd0e94	BG-2026-0007	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	30	2026-08-07	\N	\N	\N	confirmed	5000000.00	0.00	0.00	5000000.00	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:18:10.009348+00	2026-07-08 08:18:10.039465+00
\.


--
-- Data for Name: receipt_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipt_lines (id, receipt_id, variant_id, quantity, cost_price, line_order, note, qty_remaining, po_line_id, manufacturer_warranty_months, customer_warranty_months, manufacturer_warranty_start) FROM stdin;
0f9fe698-fa18-4b73-a68f-3c2c7233c30b	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	803a93f4-3dff-4d60-b448-094e08e9fac4	10	1000000.00	1	\N	10	f3fd23ae-b65e-46cb-a255-5885aea49de2	24	\N	\N
f7c500f0-cdf0-4997-825a-1a4b2f4c176d	cb0397f3-ee5b-4adb-a7e3-e81e98613038	a262e290-3061-40fd-83e5-56671e1b0325	50	15000.00	1	\N	36	\N	\N	\N	\N
31d4fec7-14ce-4d93-be47-2b04b716f74d	f6298fce-a5bc-4f8c-a298-df82e2c274be	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	800000.00	2	\N	0	5eaecac0-b792-47d7-b091-e0fbf63c03a6	24	\N	\N
13566ae3-740d-47d8-b451-44c9d080b652	680e2254-4d82-4c4c-8f14-216082697954	803a93f4-3dff-4d60-b448-094e08e9fac4	5	5000000.00	1	\N	4	45df212b-6bcd-441b-b859-9cae4e8b8031	25	24	2026-06-29 17:00:00+00
36cec9fe-fa07-4366-8f7b-be436c24a3eb	f72ffd2e-cc7a-4d74-8d09-59df22cdd5cf	803a93f4-3dff-4d60-b448-094e08e9fac4	2	1000000.00	1	\N	2	2ccedc68-2d44-4465-9106-3f1f93e45b4b	24	24	2026-06-29 17:00:00+00
2a22fe23-7c48-4894-bce0-a8d56bc5a33c	f72ffd2e-cc7a-4d74-8d09-59df22cdd5cf	803a93f4-3dff-4d60-b448-094e08e9fac4	2	1000000.00	2	\N	2	c02903e6-c74c-44fe-874a-47a0da90ea89	12	12	2026-06-29 17:00:00+00
d36a7142-275e-4388-a63c-6df4f70cf31b	a0893cb1-0410-473d-bc9d-b49fcf5ba69d	c24ef883-9913-4e81-9125-e6e0d454fe48	5	7500000.00	1	\N	5	0660db73-daa4-4beb-8959-646f256c08a5	36	\N	\N
fdd4ef14-56de-4c9d-a85e-c195c2afc126	d3902fd2-a06f-4b12-8a99-aa8ad0a3ddf1	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	1	9000000.00	1	\N	\N	\N	48	12	2026-06-30 17:00:00+00
92ec4cd6-cb13-4f6e-b697-dadaca6f0177	dc37f6cf-6a39-44ab-9375-0c00366e1b14	c24ef883-9913-4e81-9125-e6e0d454fe48	1	8000000.00	1	\N	\N	\N	\N	\N	\N
b2c33ad2-1a77-4271-91e7-ee769ca081bd	e586a5a7-f47f-4342-88c7-bf70fafd25f4	a262e290-3061-40fd-83e5-56671e1b0325	20	15000.00	2	\N	20	\N	\N	\N	\N
5b102a8f-0980-4dd0-89bf-019b02aa1744	55ec32d9-f2a3-45da-8f21-28296a5b7a6b	c24ef883-9913-4e81-9125-e6e0d454fe48	1	8000000.00	1	\N	1	\N	24	\N	\N
77d3542b-5cf2-466d-97df-fb0edf4d3fac	53af28c6-56f0-426d-8a38-b52cac828dac	c24ef883-9913-4e81-9125-e6e0d454fe48	1	8500000.00	1	\N	1	\N	12	\N	2026-01-01 00:00:00+00
c16396e9-5221-4312-8cb0-e84acac73362	95d23f4e-eda6-4e3b-aa61-f817eaf5b48b	c24ef883-9913-4e81-9125-e6e0d454fe48	1	8500000.00	1	\N	1	\N	12	\N	2026-01-01 07:00:00+00
6f33f708-999f-4f45-8c1a-f2f266d317e1	27f9927c-0e59-4e3b-b34b-33457806ac17	c24ef883-9913-4e81-9125-e6e0d454fe48	1	9000000.00	1	\N	\N	bd9fa67e-d122-40f3-a322-1c32a5b8cb95	12	\N	\N
e8a7f0d0-25f1-437f-a3c4-b4e948767dc4	a0a2adde-1e81-4dc3-92c1-e3fc813478c7	c24ef883-9913-4e81-9125-e6e0d454fe48	3	8000000.00	1	\N	0	\N	24	\N	\N
34e256de-7519-4f88-9d07-d0f88d8e0114	14f34ef2-8efc-44dc-b545-0c6e0f7ea2e5	c24ef883-9913-4e81-9125-e6e0d454fe48	3	8500000.00	1	\N	2	bd9fa67e-d122-40f3-a322-1c32a5b8cb95	12	\N	\N
b1b697e8-16dc-40ef-ab6b-64b61ef9cbe3	e586a5a7-f47f-4342-88c7-bf70fafd25f4	c24ef883-9913-4e81-9125-e6e0d454fe48	2	8500000.00	1	\N	0	\N	12	\N	\N
3005efd0-360d-4473-ab38-2a51879d5fa0	9541ddd3-71b4-46b1-805e-f964d4ed4280	61864aac-3c72-4a1f-b755-30eeb3fbae9a	1	100.00	1	\N	\N	\N	\N	\N	\N
6e192c84-2bc7-4b1b-b401-7adf802664a2	508ea8a9-6684-4022-94b3-9ecfaf697239	61864aac-3c72-4a1f-b755-30eeb3fbae9a	2	200.00	1	\N	\N	\N	\N	\N	\N
dcf16690-685c-447d-8515-75edce42cf70	39451dd9-1ac1-4d3d-8222-7ec4da09432e	803a93f4-3dff-4d60-b448-094e08e9fac4	5	1200000.00	1	\N	5	ad8bc6bf-8281-4cb2-8377-911cf98e0fa3	24	\N	\N
5a8ccdf9-beb2-4326-a1b2-e0d2182c2b1d	39451dd9-1ac1-4d3d-8222-7ec4da09432e	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	800000.00	2	\N	5	5eaecac0-b792-47d7-b091-e0fbf63c03a6	24	\N	\N
d73b4de6-208c-46b2-9979-6b6c4b631dda	f6298fce-a5bc-4f8c-a298-df82e2c274be	803a93f4-3dff-4d60-b448-094e08e9fac4	5	1200000.00	1	\N	5	ad8bc6bf-8281-4cb2-8377-911cf98e0fa3	24	\N	\N
55bebb7b-257e-48c2-96c0-fd27051f46d3	7c4ce54b-87b3-47cc-9289-96b5123b06d7	c24ef883-9913-4e81-9125-e6e0d454fe48	2	9000000.00	1	\N	0	\N	\N	\N	\N
c1976f73-6419-4b23-81bd-e609e9551f00	ab4fea1d-8e5e-42a6-87ce-00e6c85c67fd	c24ef883-9913-4e81-9125-e6e0d454fe48	1	8437500.00	1	\N	\N	\N	\N	\N	\N
5518d0cb-c1a8-4f29-a445-2f9978bcb47f	03b1e79e-ee55-412b-968e-543295556624	c24ef883-9913-4e81-9125-e6e0d454fe48	2	8437500.00	1	\N	2	\N	\N	\N	\N
6492801a-f712-459b-8098-b68cf050fcec	ca03d75c-b857-410d-b2d3-9b39d729157a	c24ef883-9913-4e81-9125-e6e0d454fe48	1	8437500.00	1	\N	\N	\N	\N	\N	\N
bd1feedc-b09a-464f-81c5-7eb65708ff78	9b4b19d0-859f-4bb5-b3a3-d205e59bdd72	c24ef883-9913-4e81-9125-e6e0d454fe48	3	8500000.00	1	\N	0	\N	\N	\N	\N
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipts (id, code, import_type, company_id, contact_id, warehouse_id, ref_document_type, ref_document_id, status, approved_by, approved_at, completed_at, note, created_by, created_at, updated_at, po_id) FROM stdin;
ca03d75c-b857-410d-b2d3-9b39d729157a	NK-2026-0023	return_in	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	quotation	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	cancelled	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 07:59:34.255114+00	2026-07-08 07:59:34.295951+00	\N
f72ffd2e-cc7a-4d74-8d09-59df22cdd5cf	NK-2026-0007	purchase	7d629756-7700-49bb-92ba-02e5859ea9be	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 06:50:04.324401+00	2026-06-30 06:50:30.82608+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 06:49:58.559407+00	2026-06-30 06:50:30.82608+00	71929fa0-5e36-4fa8-acf3-215c2c47947a
a0893cb1-0410-473d-bc9d-b49fcf5ba69d	NK-2026-0008	purchase	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	\N	\N	completed	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.534456+00	2026-07-01 03:16:08.545213+00	\N	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.517165+00	2026-07-01 03:16:08.545213+00	274aaec2-6c32-4476-8e6b-a16f22a5b6b4
a0a2adde-1e81-4dc3-92c1-e3fc813478c7	NK-2026-0009	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 06:17:18.982991+00	2026-07-01 06:17:19.012979+00	Nhập trực tiếp không qua PO	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 06:16:42.903394+00	2026-07-01 06:17:19.012979+00	\N
d3902fd2-a06f-4b12-8a99-aa8ad0a3ddf1	NK-2026-0010	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	approved	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-07 08:54:45.014965+00	\N	Đã sửa giá	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-01 06:31:56.583121+00	2026-07-07 08:54:45.014965+00	\N
14f34ef2-8efc-44dc-b545-0c6e0f7ea2e5	NK-2026-0011	purchase	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:04:51.987845+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:04:42.814606+00	2026-07-08 03:04:51.987845+00	c07aeb70-4918-4f0a-9838-266e7487f95e
39451dd9-1ac1-4d3d-8222-7ec4da09432e	NK-2026-0003	purchase	334c4c60-344e-4884-89d2-50e7d7e28d3e	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:03:45.674025+00	2026-06-26 09:04:05.808232+00	\N	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:03:38.050621+00	2026-06-26 09:04:05.808232+00	11494a64-b555-4abf-a135-9968ccf70d7a
7c4ce54b-87b3-47cc-9289-96b5123b06d7	NK-2026-0012	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:05:25.602409+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:05:25.572368+00	2026-07-08 03:05:25.602409+00	\N
f6298fce-a5bc-4f8c-a298-df82e2c274be	NK-2026-0004	purchase	334c4c60-344e-4884-89d2-50e7d7e28d3e	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:37:31.29021+00	2026-06-26 09:38:09.925801+00	\N	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:37:26.959709+00	2026-06-26 09:38:09.925801+00	11494a64-b555-4abf-a135-9968ccf70d7a
dc37f6cf-6a39-44ab-9375-0c00366e1b14	NK-2026-0013	purchase	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	cancelled	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:05:36.793654+00	2026-07-08 03:05:45.613584+00	\N
56ad99c2-9107-4f92-ac7f-5d3a1f24b641	NK-2026-0005	purchase	7d629756-7700-49bb-92ba-02e5859ea9be	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:29.708694+00	2026-06-29 03:22:53.133579+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:24.984878+00	2026-06-29 03:22:53.133579+00	3b2064b0-7469-40ea-890b-6eddc195b88f
cb0397f3-ee5b-4adb-a7e3-e81e98613038	NK-2026-0014	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:15:53.937945+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:15:53.909912+00	2026-07-08 03:15:53.937945+00	\N
680e2254-4d82-4c4c-8f14-216082697954	NK-2026-0006	purchase	7d629756-7700-49bb-92ba-02e5859ea9be	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:18:46.538058+00	2026-06-29 05:21:49.417936+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:18:42.677589+00	2026-06-29 05:21:49.417936+00	b6782d68-646f-40ed-bbc1-16eb2ee4c45e
508ea8a9-6684-4022-94b3-9ecfaf697239	NK-2026-0002	purchase	334c4c60-344e-4884-89d2-50e7d7e28d3e	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	cancelled	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-26 03:30:24.709017+00	2026-06-29 06:43:53.855724+00	\N
9541ddd3-71b4-46b1-805e-f964d4ed4280	NK-2026-0001	purchase	334c4c60-344e-4884-89d2-50e7d7e28d3e	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	cancelled	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-26 03:30:24.677908+00	2026-06-29 06:43:58.534801+00	\N
e586a5a7-f47f-4342-88c7-bf70fafd25f4	NK-2026-0015	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:16:04.906214+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:04.877044+00	2026-07-08 03:16:04.906214+00	\N
9b4b19d0-859f-4bb5-b3a3-d205e59bdd72	NK-2026-0016	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:16:15.723784+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:15.692292+00	2026-07-08 03:16:15.723784+00	\N
55ec32d9-f2a3-45da-8f21-28296a5b7a6b	NK-2026-0017	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:16:27.323414+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:27.270854+00	2026-07-08 03:16:27.323414+00	\N
53af28c6-56f0-426d-8a38-b52cac828dac	NK-2026-0018	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:16:43.123076+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:43.094682+00	2026-07-08 03:16:43.123076+00	\N
95d23f4e-eda6-4e3b-aa61-f817eaf5b48b	NK-2026-0019	purchase	\N	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	completed	\N	\N	2026-07-08 03:17:24.468977+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:17:24.444425+00	2026-07-08 03:17:24.468977+00	\N
27f9927c-0e59-4e3b-b34b-33457806ac17	NK-2026-0020	purchase	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	\N	draft	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:41:40.9967+00	2026-07-08 03:41:40.9967+00	c07aeb70-4918-4f0a-9838-266e7487f95e
ab4fea1d-8e5e-42a6-87ce-00e6c85c67fd	NK-2026-0022	return_in	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	quotation	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	cancelled	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 07:57:47.377062+00	2026-07-08 07:57:47.425975+00	\N
03b1e79e-ee55-412b-968e-543295556624	NK-2026-0021	return_in	de8586da-2c1b-418d-8395-2adaa7980b6b	\N	6e5abfe0-375e-4727-bd9d-4b1ef287b502	quotation	30b0cf51-bae9-42f9-a50d-29aaf9e8bd63	completed	\N	\N	2026-07-08 07:59:34.13216+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 07:57:47.240669+00	2026-07-08 07:59:34.13216+00	\N
\.


--
-- Data for Name: reserved_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reserved_items (id, variant_id, warehouse_id, quantity, source_type, source_id, quotation_line_item_id, created_at) FROM stdin;
a0769d6d-017e-45c2-83d7-4959276e891d	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	1	quotation	7a72b640-c2ee-44e9-bd01-1947b966ddf6	b23d78f1-4d4a-4607-adcd-ce64f32fffa6	2026-07-08 04:06:37.772697+00
f7c0d119-120a-455d-9eed-2cebad2e1a78	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	1	quotation	564c2932-7a12-4412-8c7a-aa9d6fdd0e94	82311379-1371-4ed5-8871-5a3bb49e7a7b	2026-07-08 08:18:10.039465+00
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	8b8a6a44-395b-45ac-88eb-2b7897391469
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	033b3d7f-f0e9-4a67-9a28-d71d2992adf7
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	654100e3-fbdf-4cef-a105-4f89a0189c63
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	ed60816d-f014-4fc3-bd3f-748a8a53afd8
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	0f69b104-5dc6-4440-8dcb-48b8f9a9758b
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	72de3791-82f6-4672-aff4-0c7eeac302e2
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	d21e193d-d2e3-4cd8-9412-2cf711840ae0
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	9335f3de-ac3a-4563-9348-035617946c12
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	a04ca1af-97c5-4570-a377-a0813d714af5
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	c03f5d51-746f-41be-b324-c3515e4de0d8
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	6f6d8aff-b1a6-4283-9065-890f56ca1f63
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	57e4f781-1ec8-42e0-995f-e100331df205
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	4c3822ac-321f-474f-bac3-b2c5512e9720
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	4a6a92f5-8ff3-41be-80be-0e27950cf738
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	555fc261-a790-48e1-8954-2dfe9d7eb47c
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	16c72691-2083-47dd-b028-eead78e1b3aa
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	4a437362-e646-4d01-8ce9-cc5faac913d9
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	a63b6658-3e93-48c8-ae80-bb043638794b
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	521a5a3c-914f-4640-a86f-37df7708d54d
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	1f9f75b9-24c1-4408-84f2-5313ec32e62c
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	bf8b1295-d95d-4a73-ba96-a2f9ab341268
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	68a29121-e91e-488a-b995-5ba9cb8b48f6
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	5e6c9701-8e0b-4920-8156-3e94d6114a12
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	87a88aad-bbf9-44fd-8192-96f2d8f5f77f
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	990f0c02-3349-4cec-a14b-0b3365e10ac7
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	37cdbf9e-794e-4a5c-a21d-81538ebc2ce8
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	654100e3-fbdf-4cef-a105-4f89a0189c63
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	ed60816d-f014-4fc3-bd3f-748a8a53afd8
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	72de3791-82f6-4672-aff4-0c7eeac302e2
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	d21e193d-d2e3-4cd8-9412-2cf711840ae0
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	9335f3de-ac3a-4563-9348-035617946c12
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	c03f5d51-746f-41be-b324-c3515e4de0d8
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	6f6d8aff-b1a6-4283-9065-890f56ca1f63
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	57e4f781-1ec8-42e0-995f-e100331df205
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	4a6a92f5-8ff3-41be-80be-0e27950cf738
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	555fc261-a790-48e1-8954-2dfe9d7eb47c
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	16c72691-2083-47dd-b028-eead78e1b3aa
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	521a5a3c-914f-4640-a86f-37df7708d54d
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	1f9f75b9-24c1-4408-84f2-5313ec32e62c
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	bf8b1295-d95d-4a73-ba96-a2f9ab341268
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	68a29121-e91e-488a-b995-5ba9cb8b48f6
fd81d866-9664-4c37-a1a9-7c4756c44446	0f69b104-5dc6-4440-8dcb-48b8f9a9758b
fd81d866-9664-4c37-a1a9-7c4756c44446	9335f3de-ac3a-4563-9348-035617946c12
fd81d866-9664-4c37-a1a9-7c4756c44446	a04ca1af-97c5-4570-a377-a0813d714af5
fd81d866-9664-4c37-a1a9-7c4756c44446	57e4f781-1ec8-42e0-995f-e100331df205
fd81d866-9664-4c37-a1a9-7c4756c44446	4c3822ac-321f-474f-bac3-b2c5512e9720
fd81d866-9664-4c37-a1a9-7c4756c44446	16c72691-2083-47dd-b028-eead78e1b3aa
fd81d866-9664-4c37-a1a9-7c4756c44446	4a437362-e646-4d01-8ce9-cc5faac913d9
fd81d866-9664-4c37-a1a9-7c4756c44446	a63b6658-3e93-48c8-ae80-bb043638794b
fd81d866-9664-4c37-a1a9-7c4756c44446	521a5a3c-914f-4640-a86f-37df7708d54d
fd81d866-9664-4c37-a1a9-7c4756c44446	1f9f75b9-24c1-4408-84f2-5313ec32e62c
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	ed60816d-f014-4fc3-bd3f-748a8a53afd8
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	9335f3de-ac3a-4563-9348-035617946c12
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	57e4f781-1ec8-42e0-995f-e100331df205
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	16c72691-2083-47dd-b028-eead78e1b3aa
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	521a5a3c-914f-4640-a86f-37df7708d54d
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	1f9f75b9-24c1-4408-84f2-5313ec32e62c
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	bf8b1295-d95d-4a73-ba96-a2f9ab341268
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	68a29121-e91e-488a-b995-5ba9cb8b48f6
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	608a078f-c6a3-41a9-b7a5-c7ac286bdb25
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	d5647073-4992-4174-88e6-17d271dd10a8
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	72956a2a-f2c4-485a-984e-3017a1806380
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	0e1c3346-6a5e-42df-bbc9-2e244a0dd29f
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	72956a2a-f2c4-485a-984e-3017a1806380
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	0e1c3346-6a5e-42df-bbc9-2e244a0dd29f
fd81d866-9664-4c37-a1a9-7c4756c44446	608a078f-c6a3-41a9-b7a5-c7ac286bdb25
fd81d866-9664-4c37-a1a9-7c4756c44446	d5647073-4992-4174-88e6-17d271dd10a8
fd81d866-9664-4c37-a1a9-7c4756c44446	72956a2a-f2c4-485a-984e-3017a1806380
fd81d866-9664-4c37-a1a9-7c4756c44446	0e1c3346-6a5e-42df-bbc9-2e244a0dd29f
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	0e1c3346-6a5e-42df-bbc9-2e244a0dd29f
ba74df41-1eae-4e97-ba43-4a906a5a2170	8b8a6a44-395b-45ac-88eb-2b7897391469
ba74df41-1eae-4e97-ba43-4a906a5a2170	033b3d7f-f0e9-4a67-9a28-d71d2992adf7
ba74df41-1eae-4e97-ba43-4a906a5a2170	654100e3-fbdf-4cef-a105-4f89a0189c63
ba74df41-1eae-4e97-ba43-4a906a5a2170	ed60816d-f014-4fc3-bd3f-748a8a53afd8
ba74df41-1eae-4e97-ba43-4a906a5a2170	1f9f75b9-24c1-4408-84f2-5313ec32e62c
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, is_system, created_at, updated_at) FROM stdin;
09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	Admin	Toàn bộ quyền	t	2026-06-19 07:24:40.290114+00	2026-06-19 07:24:40.290114+00
ca0f331e-f8ac-44a2-9bf0-973e3cce918e	Manager	Approve phiếu, xem báo cáo toàn bộ	t	2026-06-19 07:24:40.290114+00	2026-06-19 07:24:40.290114+00
fd81d866-9664-4c37-a1a9-7c4756c44446	Warehouse	Tạo phiếu nhập/xuất/chuyển kho, kiểm kê	t	2026-06-19 07:24:40.290114+00	2026-06-19 07:24:40.290114+00
ba74df41-1eae-4e97-ba43-4a906a5a2170	Sale	Tạo báo giá, xem tồn kho	t	2026-06-19 07:24:40.290114+00	2026-06-19 07:24:40.290114+00
9f8d6e6f-10d6-4c6a-8cdb-9360ce3622c6	Accounting	Xem toàn bộ, xuất báo cáo	t	2026-06-19 07:24:40.290114+00	2026-06-19 07:24:40.290114+00
\.


--
-- Data for Name: serial_numbers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.serial_numbers (id, serial_no, variant_id, warehouse_id, status, receipt_line_id, delivery_line_id, mac_address, manufacturer_warranty_end, note, created_at, updated_at, customer_warranty_end) FROM stdin;
00aad1c0-c8d2-450f-82f7-11719700ff4d	a2	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	13566ae3-740d-47d8-b451-44c9d080b652	\N	\N	2028-07-29 00:00:00+00	\N	2026-06-29 05:21:49.417936+00	2026-06-29 05:21:49.417936+00	\N
4eb0cb3a-ca5a-4ca7-94d2-4ad28d68e816	a3	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	13566ae3-740d-47d8-b451-44c9d080b652	\N	\N	2028-07-29 00:00:00+00	\N	2026-06-29 05:21:49.417936+00	2026-06-29 05:21:49.417936+00	\N
9ac90596-ea1a-4c9f-8d35-58cd815145c3	a4	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	13566ae3-740d-47d8-b451-44c9d080b652	\N	\N	2028-07-29 00:00:00+00	\N	2026-06-29 05:21:49.417936+00	2026-06-29 05:21:49.417936+00	\N
fa5d769a-dbd5-4022-97ce-207bb12f1048	a5	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	13566ae3-740d-47d8-b451-44c9d080b652	\N	\N	2028-07-29 00:00:00+00	\N	2026-06-29 05:21:49.417936+00	2026-06-29 05:21:49.417936+00	\N
fa262130-ca8c-4a92-b5c8-0d2b3a53da88	a1	803a93f4-3dff-4d60-b448-094e08e9fac4	\N	sold	13566ae3-740d-47d8-b451-44c9d080b652	eb4a5e8c-1121-498e-bf4a-0d7071aa3735	KHOIDOIOAS	2028-07-29 00:00:00+00	\N	2026-06-29 05:21:49.417936+00	2026-06-29 09:33:15.298685+00	2028-06-29 07:04:46.538003+00
8395b6d4-27fe-48e1-8565-51a07c84774d	1	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	dcf16690-685c-447d-8515-75edce42cf70	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
13677961-9241-43f2-aa67-54bf1c34953e	2	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	dcf16690-685c-447d-8515-75edce42cf70	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
d6e5c05d-7d11-4bb9-8c2e-409ee757a657	3	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	dcf16690-685c-447d-8515-75edce42cf70	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
64abba07-acc6-4036-84b0-d6c379279568	4	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	dcf16690-685c-447d-8515-75edce42cf70	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
673b5ac8-9560-4859-9c2d-749d8c810591	5	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	dcf16690-685c-447d-8515-75edce42cf70	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
12f215a3-40ab-467b-8e89-bf9486bc442d	6	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5a8ccdf9-beb2-4326-a1b2-e0d2182c2b1d	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
2340dcf9-7a1d-45ac-8966-d670aa699bb3	7	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5a8ccdf9-beb2-4326-a1b2-e0d2182c2b1d	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
7133bf1a-b43b-4437-bc7b-ae561332b384	8	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5a8ccdf9-beb2-4326-a1b2-e0d2182c2b1d	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
119b1874-9b91-4537-8483-22605baf4d69	9	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5a8ccdf9-beb2-4326-a1b2-e0d2182c2b1d	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
9acb8040-2947-425c-82d0-e66fb6aa9e76	10	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5a8ccdf9-beb2-4326-a1b2-e0d2182c2b1d	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:04:05.808232+00	2026-06-26 09:04:05.808232+00	\N
597eca4f-c7f9-4835-b904-c9ea43315204	sn1	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	d73b4de6-208c-46b2-9979-6b6c4b631dda	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-26 09:38:09.925801+00	\N
8c9481b7-282f-4b13-8ab6-591c47d84612	sn2	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	d73b4de6-208c-46b2-9979-6b6c4b631dda	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-26 09:38:09.925801+00	\N
69c30758-feac-47d2-a027-b4af60827aba	sn3	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	d73b4de6-208c-46b2-9979-6b6c4b631dda	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-26 09:38:09.925801+00	\N
4ab053fe-bc88-4b8f-acc1-1960b371793a	sn4	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	d73b4de6-208c-46b2-9979-6b6c4b631dda	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-26 09:38:09.925801+00	\N
3819722e-6978-4366-8553-83789a14b994	sn5	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	d73b4de6-208c-46b2-9979-6b6c4b631dda	\N	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-26 09:38:09.925801+00	\N
62eece0a-11b2-480d-b077-5a74074109f0	khai1	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	36cec9fe-fa07-4366-8f7b-be436c24a3eb	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-30 06:50:30.82608+00	2026-06-30 06:50:30.82608+00	\N
4b6f2b41-edc7-4baa-9268-d88f36f33ed5	khai2	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	36cec9fe-fa07-4366-8f7b-be436c24a3eb	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-30 06:50:30.82608+00	2026-06-30 06:50:30.82608+00	\N
622e1a7f-0c4e-4822-9dc7-5314b204f0e2	khaii2	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	2a22fe23-7c48-4894-bce0-a8d56bc5a33c	\N	\N	2027-06-29 00:00:00+00	\N	2026-06-30 06:50:30.82608+00	2026-06-30 06:50:30.82608+00	\N
7614fba0-2ae5-4e80-8a5a-404dd299fb70	khaii23	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	2a22fe23-7c48-4894-bce0-a8d56bc5a33c	\N	\N	2027-06-29 00:00:00+00	\N	2026-06-30 06:50:30.82608+00	2026-06-30 06:50:30.82608+00	\N
669ca256-697a-4ed7-b324-07c5ea7b16aa	SN-WF-001	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	active	d36a7142-275e-4388-a63c-6df4f70cf31b	\N	\N	2029-07-01 00:00:00+00	\N	2026-07-01 03:16:08.545213+00	2026-07-01 03:16:08.545213+00	\N
e39db6dc-50cf-4dd4-a8bb-80000c7f497d	dâdas	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
508c33f1-cd93-4ff3-8a73-5c1a6eb2f53e	dấdas	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
63f012e6-d4de-4ee5-9cd3-4941918c6d5b	dấdad	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
fc75eea8-e5ff-43da-84fd-3f473945aabe	dsadasda	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
2e070b00-bc71-4904-947c-f2fbff690f50	adsadsada	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
311aaa43-4c8f-4ebe-ba9c-729f461c0747	sadđ	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
f69b5831-7ea4-4a67-ac0b-40aba3dd58b1	đâsdasdadsa	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
37d0be25-d044-4bf5-87be-58c6398e8e69	ádasdadad	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
d6ba4cf3-e453-40fd-b17b-3d90b4c40bc4	adsadadasd	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
5e3b5250-e777-4b24-99c1-b928b84d2553	sadadsd	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	0f9fe698-fa18-4b73-a68f-3c2c7233c30b	\N	\N	2028-06-29 00:00:00+00	\N	2026-06-29 03:22:53.133579+00	2026-06-29 03:22:53.133579+00	\N
69cb7b4a-edf9-45a1-b60c-ad042d163241	sn6	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	\N	sold	31d4fec7-14ce-4d93-be47-2b04b716f74d	a503bfdb-504d-4b0c-8bca-6a8d82a970a7	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-29 04:07:21.043845+00	\N
284b975b-436f-4eec-80b9-5e361f6773f0	sn7	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	\N	sold	31d4fec7-14ce-4d93-be47-2b04b716f74d	a503bfdb-504d-4b0c-8bca-6a8d82a970a7	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-29 04:07:21.043845+00	\N
47b00370-d4b6-45d2-b192-dd34589935fa	sn8	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	\N	sold	31d4fec7-14ce-4d93-be47-2b04b716f74d	a503bfdb-504d-4b0c-8bca-6a8d82a970a7	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-29 04:07:21.043845+00	\N
98cfcf98-e852-4c5c-9276-b83ca32fd5c8	SN-WF-002	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	active	d36a7142-275e-4388-a63c-6df4f70cf31b	\N	\N	2029-07-01 00:00:00+00	\N	2026-07-01 03:16:08.545213+00	2026-07-01 03:16:08.545213+00	\N
56ef3bc7-457b-4923-8565-b9d76963b511	SN-WF-003	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	active	d36a7142-275e-4388-a63c-6df4f70cf31b	\N	\N	2029-07-01 00:00:00+00	\N	2026-07-01 03:16:08.545213+00	2026-07-01 03:16:08.545213+00	\N
89855f51-23d6-4d1a-824b-5a9c5c5c2c66	SN-WF-004	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	active	d36a7142-275e-4388-a63c-6df4f70cf31b	\N	\N	2029-07-01 00:00:00+00	\N	2026-07-01 03:16:08.545213+00	2026-07-01 03:16:08.545213+00	\N
e6bfd3d7-3203-45d6-820e-9da02db69ec7	SN-WF-005	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	active	d36a7142-275e-4388-a63c-6df4f70cf31b	\N	\N	2029-07-01 00:00:00+00	\N	2026-07-01 03:16:08.545213+00	2026-07-01 03:16:08.545213+00	\N
aae8ea12-855d-4961-b28a-9e5ff41d4991	SN-EDIT-001	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5b102a8f-0980-4dd0-89bf-019b02aa1744	\N	\N	2028-07-08 00:00:00+00	\N	2026-07-08 03:16:27.323414+00	2026-07-08 03:16:27.323414+00	\N
a81d6686-3d6b-43bb-b825-40cb6adc09b9	SN-WTYSTART-001	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	77d3542b-5cf2-466d-97df-fb0edf4d3fac	\N	\N	2027-01-01 00:00:00+00	\N	2026-07-08 03:16:43.123076+00	2026-07-08 03:16:43.123076+00	\N
66471e18-21f9-46b2-bc18-8fff25f79f23	SN-NOPO-C	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	sold	e8a7f0d0-25f1-437f-a3c4-b4e948767dc4	5fe85a17-237c-444e-9849-b6a8c0ecc943	\N	2028-07-01 00:00:00+00	\N	2026-07-01 06:17:19.012979+00	2026-07-08 04:03:34.042018+00	\N
94ed76c4-de03-4d50-982b-a615b75b7cd5	SN-TEST-001	c24ef883-9913-4e81-9125-e6e0d454fe48	616e07b2-1060-4e66-8163-22c42e5a7c1d	active	34e256de-7519-4f88-9d07-d0f88d8e0114	\N	\N	2027-07-08 00:00:00+00	\N	2026-07-08 03:04:51.987845+00	2026-07-08 06:45:18.93571+00	\N
352ac61a-307e-4767-b822-70997ef05046	SN-TEST-002	c24ef883-9913-4e81-9125-e6e0d454fe48	616e07b2-1060-4e66-8163-22c42e5a7c1d	active	34e256de-7519-4f88-9d07-d0f88d8e0114	\N	\N	2027-07-08 00:00:00+00	\N	2026-07-08 03:04:51.987845+00	2026-07-08 06:45:18.93571+00	\N
c5a738e3-1188-41be-8365-ab74dd634fea	SN-TEST-003	c24ef883-9913-4e81-9125-e6e0d454fe48	5538a379-9cd9-4fb4-9c95-3ce5b201f86d	active	34e256de-7519-4f88-9d07-d0f88d8e0114	fef3884c-9141-4d8c-bb32-58387f04fae6	\N	2027-07-08 00:00:00+00	\N	2026-07-08 03:04:51.987845+00	2026-07-08 06:47:53.150124+00	\N
0541b8c3-92d8-4e08-b2f4-5a4c89d43c48	SN-NOPO-002	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	disposed	55bebb7b-257e-48c2-96c0-fd27051f46d3	0e1489e6-8c18-4375-a7c1-a9ca084f3a6a	\N	\N	\N	2026-07-08 03:05:25.602409+00	2026-07-08 06:47:53.343935+00	\N
8aa85735-66b7-451f-81c8-e1f35c53a13a	SN-MIX-002	c24ef883-9913-4e81-9125-e6e0d454fe48	eed07910-c6a2-4702-bb0a-59d3a47f3bdf	active	b1b697e8-16dc-40ef-ab6b-64b61ef9cbe3	b08bc920-b39e-4b7d-b07e-76598b7384fb	\N	2027-07-08 00:00:00+00	\N	2026-07-08 03:16:04.906214+00	2026-07-08 06:51:17.48428+00	\N
326ef46e-939c-4441-a703-e5a48ff4b1e6	SN-NOPO-001	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	sold	55bebb7b-257e-48c2-96c0-fd27051f46d3	81c6f523-5af3-4b7a-bb0c-19d36ba9c421	\N	\N	\N	2026-07-08 03:05:25.602409+00	2026-07-08 06:51:33.38011+00	\N
0e1fef66-e721-4ada-93a5-effd5d365cb9	SN-WRONG-001	c24ef883-9913-4e81-9125-e6e0d454fe48	616e07b2-1060-4e66-8163-22c42e5a7c1d	active	bd1feedc-b09a-464f-81c5-7eb65708ff78	bafa0a9f-264d-451e-9181-aa6f047a4c98	\N	\N	\N	2026-07-08 03:16:15.723784+00	2026-07-08 06:52:02.23399+00	\N
d38417ff-dc4b-4d1d-8327-ccf135b5a23b	SN-WRONG-002	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	sold	bd1feedc-b09a-464f-81c5-7eb65708ff78	cdb65d16-93a4-4480-9971-1bc5cb6ad2d2	\N	\N	\N	2026-07-08 03:16:15.723784+00	2026-07-08 08:09:59.625665+00	\N
a6f876e5-22ee-4990-884e-796c66e22f0b	SN-WRONG-003	c24ef883-9913-4e81-9125-e6e0d454fe48	\N	sold	bd1feedc-b09a-464f-81c5-7eb65708ff78	f23940f3-9229-452c-82a8-0fc8f6bef8fa	\N	\N	\N	2026-07-08 03:16:15.723784+00	2026-07-08 08:10:25.863682+00	\N
548a1736-c3c3-4de2-aa40-fa572504acf8	sn9	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	\N	sold	31d4fec7-14ce-4d93-be47-2b04b716f74d	a503bfdb-504d-4b0c-8bca-6a8d82a970a7	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-29 04:07:21.043845+00	\N
9b02176c-57f7-430e-9792-d356f3488671	sn10	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	\N	sold	31d4fec7-14ce-4d93-be47-2b04b716f74d	a503bfdb-504d-4b0c-8bca-6a8d82a970a7	\N	2028-06-26 00:00:00+00	\N	2026-06-26 09:38:09.925801+00	2026-06-29 04:07:21.043845+00	\N
d71db2c0-3097-47ab-a16c-9e10345b4bf7	SN-TZ-001	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	c16396e9-5221-4312-8cb0-e84acac73362	\N	\N	2027-01-01 00:00:00+00	\N	2026-07-08 03:17:24.468977+00	2026-07-08 03:17:24.468977+00	\N
a3a5df2e-d686-470e-bc86-a292d00f96d9	SN-NOPO-A	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5518d0cb-c1a8-4f29-a445-2f9978bcb47f	\N	\N	2028-07-01 00:00:00+00	\N	2026-07-01 06:17:19.012979+00	2026-07-08 07:59:34.13216+00	\N
dbc35f21-8201-4a8c-8ed3-55a018763261	SN-NOPO-B	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	active	5518d0cb-c1a8-4f29-a445-2f9978bcb47f	\N	\N	2028-07-01 00:00:00+00	\N	2026-07-01 06:17:19.012979+00	2026-07-08 07:59:34.13216+00	\N
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_movements (id, variant_id, warehouse_id, serial_id, movement_type, quantity, unit_cost, ref_document_type, ref_document_id, created_by, created_at) FROM stdin;
10831ec8-5ddb-4ed0-8085-f68892eabd44	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	8395b6d4-27fe-48e1-8565-51a07c84774d	in	1	1200000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
e069abc4-aa0e-47ce-a959-000811689621	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	13677961-9241-43f2-aa67-54bf1c34953e	in	1	1200000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
f1d0dc57-e1c1-4b79-beba-ecb0a9a6bbd8	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	d6e5c05d-7d11-4bb9-8c2e-409ee757a657	in	1	1200000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
fa1470e8-1bd3-4311-85fd-4e570b842728	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	64abba07-acc6-4036-84b0-d6c379279568	in	1	1200000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
5844672d-cb95-4dab-a767-3a32ae83ebea	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	673b5ac8-9560-4859-9c2d-749d8c810591	in	1	1200000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
52171465-aaaf-4c2c-9bd1-94cd2bea67f7	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	12f215a3-40ab-467b-8e89-bf9486bc442d	in	1	800000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
4b60a625-fd87-4bb2-8eb8-a9c4a555907d	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	2340dcf9-7a1d-45ac-8966-d670aa699bb3	in	1	800000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
06018ea7-e83e-4f9c-85dd-01d259f65919	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	7133bf1a-b43b-4437-bc7b-ae561332b384	in	1	800000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
d58f02c8-e07d-4564-b2ed-8aa738cc7fb3	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	119b1874-9b91-4537-8483-22605baf4d69	in	1	800000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
fc575456-4bd7-419a-9f5c-04f786778953	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	9acb8040-2947-425c-82d0-e66fb6aa9e76	in	1	800000.00	receipt	39451dd9-1ac1-4d3d-8222-7ec4da09432e	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:04:05.808232+00
c706df1c-2832-47c3-aee9-fe25f70f4e48	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	597eca4f-c7f9-4835-b904-c9ea43315204	in	1	1200000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
41906408-bb08-4dc5-a0fc-51a6e99f4e21	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	8c9481b7-282f-4b13-8ab6-591c47d84612	in	1	1200000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
e816c72c-de17-4e1e-90f3-360b6ce385ed	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	69c30758-feac-47d2-a027-b4af60827aba	in	1	1200000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
290d8743-e715-452b-8b3b-6ff1b64eea2c	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	4ab053fe-bc88-4b8f-acc1-1960b371793a	in	1	1200000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
2b5d1362-4c6a-48e7-b770-1fcbcd6aec10	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	3819722e-6978-4366-8553-83789a14b994	in	1	1200000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
54bfd2fd-de40-408c-87d0-6d1852b93874	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	69cb7b4a-edf9-45a1-b60c-ad042d163241	in	1	800000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
d540a1b0-fa08-4d13-a987-9e746d3b5dd3	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	284b975b-436f-4eec-80b9-5e361f6773f0	in	1	800000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
314f3fd8-de33-4521-9bce-e1b89f68eaa3	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	47b00370-d4b6-45d2-b192-dd34589935fa	in	1	800000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
c5b62957-f327-42e6-a751-567c91fd4a41	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	548a1736-c3c3-4de2-aa40-fa572504acf8	in	1	800000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
12176f9d-e6be-4a6c-a967-06f52538ba47	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	9b02176c-57f7-430e-9792-d356f3488671	in	1	800000.00	receipt	f6298fce-a5bc-4f8c-a298-df82e2c274be	52bd64bc-8dec-4d06-8739-2302edfc1d2f	2026-06-26 09:38:09.925801+00
b6062b13-5223-4ea7-97a0-842fcabdaa57	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	e39db6dc-50cf-4dd4-a8bb-80000c7f497d	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
ebab82bc-1f84-46c0-a11f-8105c28b2370	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	508c33f1-cd93-4ff3-8a73-5c1a6eb2f53e	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
bab65a6f-e99a-4a08-bca4-d951ea4cb07c	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	63f012e6-d4de-4ee5-9cd3-4941918c6d5b	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
decd3559-a766-44f7-b1fb-280a977f7e06	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	fc75eea8-e5ff-43da-84fd-3f473945aabe	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
6e60c2f7-fe22-4e56-8769-5ab921e16cae	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	2e070b00-bc71-4904-947c-f2fbff690f50	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
2286bcae-29e6-46fe-af97-8a83dc7e4d02	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	311aaa43-4c8f-4ebe-ba9c-729f461c0747	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
a1456171-583d-403d-a20b-807b75730d36	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	f69b5831-7ea4-4a67-ac0b-40aba3dd58b1	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
5b51dacd-a9f7-47ec-b458-4bafb05c1237	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	37d0be25-d044-4bf5-87be-58c6398e8e69	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
a4978d1e-38ff-4a94-8a4e-9022582690c1	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	d6ba4cf3-e453-40fd-b17b-3d90b4c40bc4	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
71b7e3ec-a60b-46ef-9d40-6a399a6b196a	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	5e3b5250-e777-4b24-99c1-b928b84d2553	in	1	1000000.00	receipt	56ad99c2-9107-4f92-ac7f-5d3a1f24b641	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 03:22:53.133579+00
a52c3b25-85e9-4f77-818c-1e2f23cf9a01	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	69cb7b4a-edf9-45a1-b60c-ad042d163241	out	1	800000.00	delivery_order	7dff023a-e8e3-4135-a365-3d461168ad39	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 04:07:21.043845+00
c2887f7f-8ebc-44c9-b8d9-bf5821c1948a	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	284b975b-436f-4eec-80b9-5e361f6773f0	out	1	800000.00	delivery_order	7dff023a-e8e3-4135-a365-3d461168ad39	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 04:07:21.043845+00
085c686b-948f-4f83-8590-943707e36db0	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	47b00370-d4b6-45d2-b192-dd34589935fa	out	1	800000.00	delivery_order	7dff023a-e8e3-4135-a365-3d461168ad39	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 04:07:21.043845+00
2d53c61f-fe1d-4eee-a5c7-92328bec1be8	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	548a1736-c3c3-4de2-aa40-fa572504acf8	out	1	800000.00	delivery_order	7dff023a-e8e3-4135-a365-3d461168ad39	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 04:07:21.043845+00
8c5a196a-cf6f-45cb-93ef-97810c621d4c	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	6e5abfe0-375e-4727-bd9d-4b1ef287b502	9b02176c-57f7-430e-9792-d356f3488671	out	1	800000.00	delivery_order	7dff023a-e8e3-4135-a365-3d461168ad39	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 04:07:21.043845+00
5137ddd5-66fc-4b9a-9faf-44d197b8b0f5	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	fa262130-ca8c-4a92-b5c8-0d2b3a53da88	in	1	5000000.00	receipt	680e2254-4d82-4c4c-8f14-216082697954	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:21:49.417936+00
5acd9d80-bbbe-4ba7-b570-42a2fe938bea	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	00aad1c0-c8d2-450f-82f7-11719700ff4d	in	1	5000000.00	receipt	680e2254-4d82-4c4c-8f14-216082697954	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:21:49.417936+00
334cff58-a382-4149-97d0-b6649d51122a	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	4eb0cb3a-ca5a-4ca7-94d2-4ad28d68e816	in	1	5000000.00	receipt	680e2254-4d82-4c4c-8f14-216082697954	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:21:49.417936+00
f2fe5187-bb51-4fb4-81c6-f330f666fce1	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	9ac90596-ea1a-4c9f-8d35-58cd815145c3	in	1	5000000.00	receipt	680e2254-4d82-4c4c-8f14-216082697954	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:21:49.417936+00
81ecbf05-90ec-46a8-9823-42fcb3f72266	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	fa5d769a-dbd5-4022-97ce-207bb12f1048	in	1	5000000.00	receipt	680e2254-4d82-4c4c-8f14-216082697954	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 05:21:49.417936+00
62ba4fe8-6142-40df-a6e4-1dddef541244	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	fa262130-ca8c-4a92-b5c8-0d2b3a53da88	out	1	1880000.00	delivery_order	9883eea9-3c80-4030-9c74-1b34827e12e2	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-29 07:04:46.538003+00
414f5104-5713-45e7-a753-b4313049c123	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	62eece0a-11b2-480d-b077-5a74074109f0	in	1	1000000.00	receipt	f72ffd2e-cc7a-4d74-8d09-59df22cdd5cf	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 06:50:30.82608+00
c4ce1bba-5055-4e5b-8da1-d1b878c265bd	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	4b6f2b41-edc7-4baa-9268-d88f36f33ed5	in	1	1000000.00	receipt	f72ffd2e-cc7a-4d74-8d09-59df22cdd5cf	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 06:50:30.82608+00
3bbcd388-94bf-41e1-9a73-cc2adab64506	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	622e1a7f-0c4e-4822-9dc7-5314b204f0e2	in	1	1000000.00	receipt	f72ffd2e-cc7a-4d74-8d09-59df22cdd5cf	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 06:50:30.82608+00
119db802-f752-450e-af84-4c67016d1acd	803a93f4-3dff-4d60-b448-094e08e9fac4	6e5abfe0-375e-4727-bd9d-4b1ef287b502	7614fba0-2ae5-4e80-8a5a-404dd299fb70	in	1	1000000.00	receipt	f72ffd2e-cc7a-4d74-8d09-59df22cdd5cf	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-06-30 06:50:30.82608+00
bf389396-4122-48d1-ae58-5cca068062d6	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	669ca256-697a-4ed7-b324-07c5ea7b16aa	in	1	7500000.00	receipt	a0893cb1-0410-473d-bc9d-b49fcf5ba69d	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.545213+00
5e921853-9d68-4200-b9a2-a9f91cc50376	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	98cfcf98-e852-4c5c-9276-b83ca32fd5c8	in	1	7500000.00	receipt	a0893cb1-0410-473d-bc9d-b49fcf5ba69d	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.545213+00
3945e99f-dee8-4069-b23d-7e581e1afbde	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	56ef3bc7-457b-4923-8565-b9d76963b511	in	1	7500000.00	receipt	a0893cb1-0410-473d-bc9d-b49fcf5ba69d	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.545213+00
17ab6358-3580-4326-979a-f85adeb6c88d	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	89855f51-23d6-4d1a-824b-5a9c5c5c2c66	in	1	7500000.00	receipt	a0893cb1-0410-473d-bc9d-b49fcf5ba69d	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.545213+00
d0060998-072f-44bc-9beb-6957929a117f	c24ef883-9913-4e81-9125-e6e0d454fe48	7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	e6bfd3d7-3203-45d6-820e-9da02db69ec7	in	1	7500000.00	receipt	a0893cb1-0410-473d-bc9d-b49fcf5ba69d	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 03:16:08.545213+00
fed9e17e-4215-47aa-a275-68d194470c9d	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	a3a5df2e-d686-470e-bc86-a292d00f96d9	in	1	8000000.00	receipt	a0a2adde-1e81-4dc3-92c1-e3fc813478c7	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 06:17:19.012979+00
d9fa7259-594c-48e4-a23e-b2eadf4f1265	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	dbc35f21-8201-4a8c-8ed3-55a018763261	in	1	8000000.00	receipt	a0a2adde-1e81-4dc3-92c1-e3fc813478c7	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 06:17:19.012979+00
9a971f10-0de7-4f3c-b1b8-4a6664f72af4	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	66471e18-21f9-46b2-bc18-8fff25f79f23	in	1	8000000.00	receipt	a0a2adde-1e81-4dc3-92c1-e3fc813478c7	0c1883bf-9b06-473c-b7db-90538d313a90	2026-07-01 06:17:19.012979+00
57a821f0-02fa-4b81-bca9-9e6d484b0b5a	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	94ed76c4-de03-4d50-982b-a615b75b7cd5	in	1	8500000.00	receipt	14f34ef2-8efc-44dc-b545-0c6e0f7ea2e5	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:04:51.987845+00
48eb6d57-9c3e-46df-b398-70ea37f91b26	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	352ac61a-307e-4767-b822-70997ef05046	in	1	8500000.00	receipt	14f34ef2-8efc-44dc-b545-0c6e0f7ea2e5	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:04:51.987845+00
bdee51b1-3a72-4dae-937e-cc8472b6e869	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	c5a738e3-1188-41be-8365-ab74dd634fea	in	1	8500000.00	receipt	14f34ef2-8efc-44dc-b545-0c6e0f7ea2e5	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:04:51.987845+00
dbea4546-8aa6-4978-9199-8ddb5bb04f5f	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	326ef46e-939c-4441-a703-e5a48ff4b1e6	in	1	9000000.00	receipt	7c4ce54b-87b3-47cc-9289-96b5123b06d7	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:05:25.602409+00
70584c6e-e5b1-493a-abd2-90ee4c97bce4	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	0541b8c3-92d8-4e08-b2f4-5a4c89d43c48	in	1	9000000.00	receipt	7c4ce54b-87b3-47cc-9289-96b5123b06d7	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:05:25.602409+00
bbbda430-15eb-439a-8025-27d24f9e11ff	a262e290-3061-40fd-83e5-56671e1b0325	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	in	50	15000.00	receipt	cb0397f3-ee5b-4adb-a7e3-e81e98613038	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:15:53.937945+00
2352d68b-543e-459d-81c0-c4c4d8327587	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	8aa85735-66b7-451f-81c8-e1f35c53a13a	in	1	8500000.00	receipt	e586a5a7-f47f-4342-88c7-bf70fafd25f4	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:04.906214+00
25e0b42c-0389-4cef-82fd-e4ee5a88c4b7	a262e290-3061-40fd-83e5-56671e1b0325	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	in	20	15000.00	receipt	e586a5a7-f47f-4342-88c7-bf70fafd25f4	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:04.906214+00
c3095a0c-b05f-41a3-be53-61a836d0a858	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	0e1fef66-e721-4ada-93a5-effd5d365cb9	in	1	8500000.00	receipt	9b4b19d0-859f-4bb5-b3a3-d205e59bdd72	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:15.723784+00
1b2403b6-9f40-4db5-bec6-204a81f97d59	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	d38417ff-dc4b-4d1d-8327-ccf135b5a23b	in	1	8500000.00	receipt	9b4b19d0-859f-4bb5-b3a3-d205e59bdd72	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:15.723784+00
c1ad4475-0d98-4001-b200-8d0664ebe318	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	a6f876e5-22ee-4990-884e-796c66e22f0b	in	1	8500000.00	receipt	9b4b19d0-859f-4bb5-b3a3-d205e59bdd72	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:15.723784+00
b6b1be52-354c-41d8-97f1-597a9a6592ac	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	aae8ea12-855d-4961-b28a-9e5ff41d4991	in	1	8000000.00	receipt	55ec32d9-f2a3-45da-8f21-28296a5b7a6b	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:27.323414+00
9940c713-6cf7-40d6-b654-a4027ca91801	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	a81d6686-3d6b-43bb-b825-40cb6adc09b9	in	1	8500000.00	receipt	53af28c6-56f0-426d-8a38-b52cac828dac	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:43.123076+00
65a4db60-b6f0-449e-b554-a31e713a9c92	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	d71db2c0-3097-47ab-a16c-9e10345b4bf7	in	1	8500000.00	receipt	95d23f4e-eda6-4e3b-aa61-f817eaf5b48b	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:17:24.468977+00
c15b73c8-d759-472e-8995-9e3ad29b1627	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	a3a5df2e-d686-470e-bc86-a292d00f96d9	out	1	8437500.00	delivery_order	0e7fc332-369c-451a-a045-38b5155a6e84	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:03:04.948014+00
35e7702b-649b-4e11-9d49-e2396589e974	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	dbc35f21-8201-4a8c-8ed3-55a018763261	out	1	8437500.00	delivery_order	0e7fc332-369c-451a-a045-38b5155a6e84	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:03:04.948014+00
1b847719-302a-4d7e-b473-e9a3121fcfd7	a262e290-3061-40fd-83e5-56671e1b0325	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	out	10	15000.00	delivery_order	0e7fc332-369c-451a-a045-38b5155a6e84	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:03:04.948014+00
5dbbc947-3f69-43e5-bafd-e1c2807c4876	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	66471e18-21f9-46b2-bc18-8fff25f79f23	out	1	8437500.00	delivery_order	3f8527be-ebf4-4b0c-98f8-8adcc94d111a	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 04:03:34.042018+00
57d8a687-67e6-4963-82be-03bcc42a2745	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	94ed76c4-de03-4d50-982b-a615b75b7cd5	out	1	8437500.00	transfer_order	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:18.93571+00
095a3c0b-ea17-488e-a127-21fa29768261	c24ef883-9913-4e81-9125-e6e0d454fe48	616e07b2-1060-4e66-8163-22c42e5a7c1d	94ed76c4-de03-4d50-982b-a615b75b7cd5	in	1	8437500.00	transfer_order	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:18.93571+00
d6fee6f0-fb57-4649-a83e-999fb1c7197e	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	352ac61a-307e-4767-b822-70997ef05046	out	1	8437500.00	transfer_order	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:18.93571+00
ab8c7e2f-0cf8-489b-8faf-9581640d856f	c24ef883-9913-4e81-9125-e6e0d454fe48	616e07b2-1060-4e66-8163-22c42e5a7c1d	352ac61a-307e-4767-b822-70997ef05046	in	1	8437500.00	transfer_order	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:18.93571+00
127c5e10-b959-4ae6-bf9d-747d9c415231	a262e290-3061-40fd-83e5-56671e1b0325	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	out	5	15000.00	transfer_order	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:18.93571+00
d74ff7fa-65ac-47df-b827-b0d40060df86	a262e290-3061-40fd-83e5-56671e1b0325	616e07b2-1060-4e66-8163-22c42e5a7c1d	\N	in	5	15000.00	transfer_order	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:18.93571+00
9aaf8861-1092-47a7-a023-7c7f7ee9dd12	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	c5a738e3-1188-41be-8365-ab74dd634fea	out	1	8437500.00	delivery_order	d3ef9760-e9a7-4c6b-a40f-f3e4fead7c29	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:47:53.150124+00
2afbdbd3-ddba-4411-b43a-f690c2ccae0b	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	0541b8c3-92d8-4e08-b2f4-5a4c89d43c48	out	1	8437500.00	delivery_order	d720ddae-4dfb-4ff5-b05a-120ee35eef1c	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:47:53.343935+00
f2b06d94-90f6-4f05-9fd2-5e52831dca63	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	in	1	8500000.00	receipt	e586a5a7-f47f-4342-88c7-bf70fafd25f4	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 03:16:04.906214+00
363fc373-beb8-40be-9b89-d6baac929792	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	out	1	8437500.00	delivery_order	36090ced-85c2-49be-81ed-ea8ca9ccb7f9	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:47:53.438266+00
c1343389-554a-4be5-a7de-061f32c44c6c	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	326ef46e-939c-4441-a703-e5a48ff4b1e6	out	1	8437500.00	delivery_order	40a24905-d44b-4b0f-b83a-b13fc5a86a51	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:49:02.953722+00
a9dfcd18-c478-46b9-bd71-633b4b2ab74c	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	8aa85735-66b7-451f-81c8-e1f35c53a13a	out	1	8437500.00	delivery_order	90c91881-2fb7-4371-bc42-8a521d845018	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:17.48428+00
c72e687c-f6cf-4e8b-beed-61ab9787ee8d	c24ef883-9913-4e81-9125-e6e0d454fe48	eed07910-c6a2-4702-bb0a-59d3a47f3bdf	326ef46e-939c-4441-a703-e5a48ff4b1e6	out	1	8437500.00	transfer_order	5f6b1f62-8f24-4c79-9624-a4c5ce27b729	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:17.601761+00
bf8b7b87-4177-4dd6-81db-f8831df341ff	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	326ef46e-939c-4441-a703-e5a48ff4b1e6	in	1	8437500.00	transfer_order	5f6b1f62-8f24-4c79-9624-a4c5ce27b729	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:17.601761+00
f5bfbc09-5e5d-4bd8-8bc7-3a4e57bb8ddf	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	326ef46e-939c-4441-a703-e5a48ff4b1e6	out	1	8437500.00	delivery_order	5d8fb8a7-dbf1-493e-bf63-73173c67ee43	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:33.38011+00
74ce5e64-ced3-4966-87e5-409c1048d91c	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	0e1fef66-e721-4ada-93a5-effd5d365cb9	out	1	8437500.00	delivery_order	cda0d71c-5d64-4cd7-8099-24068c56be65	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:52:02.110183+00
40869dd9-6537-4584-8a99-7422d893223c	c24ef883-9913-4e81-9125-e6e0d454fe48	5538a379-9cd9-4fb4-9c95-3ce5b201f86d	0e1fef66-e721-4ada-93a5-effd5d365cb9	out	1	8437500.00	transfer_order	f828aa8e-a93e-41d0-8999-ce927525896f	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:52:02.23399+00
7d34678a-4de6-4bca-9116-366aaf13e599	c24ef883-9913-4e81-9125-e6e0d454fe48	616e07b2-1060-4e66-8163-22c42e5a7c1d	0e1fef66-e721-4ada-93a5-effd5d365cb9	in	1	8437500.00	transfer_order	f828aa8e-a93e-41d0-8999-ce927525896f	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:52:02.23399+00
f04a203e-dd5f-4c50-a9eb-2974df73a13a	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	a3a5df2e-d686-470e-bc86-a292d00f96d9	in	1	8437500.00	receipt	03b1e79e-ee55-412b-968e-543295556624	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 07:59:34.13216+00
e07e6b52-bb1e-4228-8c13-aa54f64014ca	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	dbc35f21-8201-4a8c-8ed3-55a018763261	in	1	8437500.00	receipt	03b1e79e-ee55-412b-968e-543295556624	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 07:59:34.13216+00
aec17a09-0985-4bd0-991c-ee0de9b2028f	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	d38417ff-dc4b-4d1d-8327-ccf135b5a23b	out	1	8437500.00	delivery_order	9e312a88-3f1d-4839-9e04-9a5041c56dca	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:09:59.625665+00
c922d3e2-fba6-4d81-96ba-82a27117df39	a262e290-3061-40fd-83e5-56671e1b0325	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	out	2	15000.00	delivery_order	9e312a88-3f1d-4839-9e04-9a5041c56dca	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:09:59.625665+00
18ffe8aa-47b5-4c6b-a7d8-8761a50ad688	c24ef883-9913-4e81-9125-e6e0d454fe48	6e5abfe0-375e-4727-bd9d-4b1ef287b502	a6f876e5-22ee-4990-884e-796c66e22f0b	out	1	8437500.00	delivery_order	1bad3326-6c02-42f5-951f-1dd1ee633959	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:10:25.863682+00
a8ba4693-8c42-4762-accc-c176a6991e67	a262e290-3061-40fd-83e5-56671e1b0325	6e5abfe0-375e-4727-bd9d-4b1ef287b502	\N	out	2	15000.00	delivery_order	1bad3326-6c02-42f5-951f-1dd1ee633959	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 08:10:25.863682+00
\.


--
-- Data for Name: stocktake_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktake_lines (id, stocktake_id, variant_id, qty_system, qty_actual) FROM stdin;
993bd43e-d790-435e-bde5-1d6b909c8fad	12bc28a6-9619-4e9b-8082-ef3e0fda3235	803a93f4-3dff-4d60-b448-094e08e9fac4	5	4
219a8293-e273-43c6-a4d5-b144a1e1ae22	12bc28a6-9619-4e9b-8082-ef3e0fda3235	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	4
cf25f156-35f4-4657-9a91-dafb5ffa7475	ef3e051a-a0d0-4f54-aaae-85ac528ed3d1	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	\N
592ea737-58d5-442a-b86d-a349d5d24f97	ef3e051a-a0d0-4f54-aaae-85ac528ed3d1	803a93f4-3dff-4d60-b448-094e08e9fac4	28	\N
639967c4-6861-419a-9572-40fdacefb645	ef3e051a-a0d0-4f54-aaae-85ac528ed3d1	c24ef883-9913-4e81-9125-e6e0d454fe48	5	\N
6036a964-a0b0-4d6b-be76-768fb6655241	ef3e051a-a0d0-4f54-aaae-85ac528ed3d1	a262e290-3061-40fd-83e5-56671e1b0325	55	\N
74f4f023-0dad-479d-8997-878d11518c9a	8ce92f46-db6f-4763-802e-e7769c3eb932	a262e290-3061-40fd-83e5-56671e1b0325	55	60
7cde1eaf-15dc-44a3-b904-1fed05973db9	8ce92f46-db6f-4763-802e-e7769c3eb932	c24ef883-9913-4e81-9125-e6e0d454fe48	5	3
a5582e38-0cb4-4e50-b73e-1cc842a272e8	8ce92f46-db6f-4763-802e-e7769c3eb932	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	5
74c154bf-59ec-4bd8-9fd9-eba5e6e7196d	8ce92f46-db6f-4763-802e-e7769c3eb932	803a93f4-3dff-4d60-b448-094e08e9fac4	28	28
5f44b677-8b46-4b80-95a5-916708d1854d	e906c402-3041-48d3-8db6-9a56325c06ac	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	\N
e9966cb1-84e7-4497-bd3a-d0ec507553c0	e906c402-3041-48d3-8db6-9a56325c06ac	803a93f4-3dff-4d60-b448-094e08e9fac4	28	\N
1bb8f27b-7954-4e2e-8331-2abe260b678c	e906c402-3041-48d3-8db6-9a56325c06ac	c24ef883-9913-4e81-9125-e6e0d454fe48	5	\N
2dc4a3a4-63e1-4863-81b9-c04aa7441f72	e906c402-3041-48d3-8db6-9a56325c06ac	a262e290-3061-40fd-83e5-56671e1b0325	55	\N
32c58eff-63f3-4114-91e3-baeddbb03eac	6234b3a1-9fbc-4964-b34c-38a0dfbbface	26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	5	\N
77719b92-ada0-4247-adc4-6d7257c31457	6234b3a1-9fbc-4964-b34c-38a0dfbbface	803a93f4-3dff-4d60-b448-094e08e9fac4	28	\N
ecedbdc6-4ca4-45b2-ba30-3faf878f0450	6234b3a1-9fbc-4964-b34c-38a0dfbbface	c24ef883-9913-4e81-9125-e6e0d454fe48	5	\N
e9f19144-c139-4808-9b4b-72b4d487cecb	6234b3a1-9fbc-4964-b34c-38a0dfbbface	a262e290-3061-40fd-83e5-56671e1b0325	55	\N
\.


--
-- Data for Name: stocktake_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktake_results (id, stocktake_id, total_sku, matched, shortage, surplus, created_at, note) FROM stdin;
b685ebde-fd11-461f-915d-febc8d2bf506	12bc28a6-9619-4e9b-8082-ef3e0fda3235	2	0	2	0	2026-06-26 09:34:32.932664+00	\N
53cfe5ab-85dd-45e4-bbc7-e879ab57eaac	8ce92f46-db6f-4763-802e-e7769c3eb932	4	2	1	1	2026-07-08 06:54:17.717669+00	\N
\.


--
-- Data for Name: stocktake_serials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktake_serials (id, stocktake_id, serial_id, status) FROM stdin;
1546dbbe-849e-4ae7-b0c2-ed916107e171	12bc28a6-9619-4e9b-8082-ef3e0fda3235	8395b6d4-27fe-48e1-8565-51a07c84774d	missing
3a351703-14bf-4b09-b400-d959e457ed47	12bc28a6-9619-4e9b-8082-ef3e0fda3235	13677961-9241-43f2-aa67-54bf1c34953e	missing
81a727e9-2b77-4bd3-be11-0ae579c2fe51	12bc28a6-9619-4e9b-8082-ef3e0fda3235	d6e5c05d-7d11-4bb9-8c2e-409ee757a657	missing
0e6a851e-55aa-46b6-b303-9bbe3de6acb9	12bc28a6-9619-4e9b-8082-ef3e0fda3235	64abba07-acc6-4036-84b0-d6c379279568	missing
b83754b7-5b57-4b6c-8581-49c0d9fc9aed	12bc28a6-9619-4e9b-8082-ef3e0fda3235	673b5ac8-9560-4859-9c2d-749d8c810591	missing
0a28b737-433a-4cb9-a11c-6a63ffe30f2f	12bc28a6-9619-4e9b-8082-ef3e0fda3235	12f215a3-40ab-467b-8e89-bf9486bc442d	missing
b617fcf7-fb12-4ffd-9a9a-9da96f01794e	12bc28a6-9619-4e9b-8082-ef3e0fda3235	2340dcf9-7a1d-45ac-8966-d670aa699bb3	missing
3b887593-9ded-4c0d-9cd5-00c4f6242785	12bc28a6-9619-4e9b-8082-ef3e0fda3235	7133bf1a-b43b-4437-bc7b-ae561332b384	missing
cc42d3ab-dad5-42ce-aae3-8649f88aa337	12bc28a6-9619-4e9b-8082-ef3e0fda3235	119b1874-9b91-4537-8483-22605baf4d69	missing
59ee04ad-a679-4c32-9495-302bdc286aec	12bc28a6-9619-4e9b-8082-ef3e0fda3235	9acb8040-2947-425c-82d0-e66fb6aa9e76	missing
4452c9cb-d67c-4fc7-9855-01a1964d1129	8ce92f46-db6f-4763-802e-e7769c3eb932	d38417ff-dc4b-4d1d-8327-ccf135b5a23b	missing
f786f0dc-157d-4146-9b1b-5ae31fc405d2	8ce92f46-db6f-4763-802e-e7769c3eb932	a6f876e5-22ee-4990-884e-796c66e22f0b	missing
197293e7-aebf-485e-9537-0f77dcb489f5	8ce92f46-db6f-4763-802e-e7769c3eb932	aae8ea12-855d-4961-b28a-9e5ff41d4991	missing
4edf5f9c-c12f-4320-82c7-d6c2032264a9	8ce92f46-db6f-4763-802e-e7769c3eb932	a81d6686-3d6b-43bb-b825-40cb6adc09b9	missing
d7366c54-0315-4e87-ac72-a80cddd3caf5	8ce92f46-db6f-4763-802e-e7769c3eb932	d71db2c0-3097-47ab-a16c-9e10345b4bf7	missing
799d30eb-1d0a-4495-ad65-5cb2729bcd2e	8ce92f46-db6f-4763-802e-e7769c3eb932	12f215a3-40ab-467b-8e89-bf9486bc442d	missing
af646223-c496-4915-a852-4f2d6bd7498f	8ce92f46-db6f-4763-802e-e7769c3eb932	2340dcf9-7a1d-45ac-8966-d670aa699bb3	missing
f74fda29-dc08-4ad2-a4b4-10f43c8943d9	8ce92f46-db6f-4763-802e-e7769c3eb932	7133bf1a-b43b-4437-bc7b-ae561332b384	missing
514502fa-8ef4-4aa9-8931-2c8412eaa291	8ce92f46-db6f-4763-802e-e7769c3eb932	119b1874-9b91-4537-8483-22605baf4d69	missing
1d7dc59e-69a8-465a-9a74-7ad4976aedde	8ce92f46-db6f-4763-802e-e7769c3eb932	9acb8040-2947-425c-82d0-e66fb6aa9e76	missing
b5deff97-da61-45a9-9de0-b6f68eb9a3d9	8ce92f46-db6f-4763-802e-e7769c3eb932	00aad1c0-c8d2-450f-82f7-11719700ff4d	missing
06ddb6a0-a596-4f53-974d-595ab98dcc52	8ce92f46-db6f-4763-802e-e7769c3eb932	4eb0cb3a-ca5a-4ca7-94d2-4ad28d68e816	missing
e5d6a28d-a9d0-4966-9a13-ee53fceb90d1	8ce92f46-db6f-4763-802e-e7769c3eb932	9ac90596-ea1a-4c9f-8d35-58cd815145c3	missing
e2e4bd06-111b-474b-a4d2-ce79b1234515	8ce92f46-db6f-4763-802e-e7769c3eb932	fa5d769a-dbd5-4022-97ce-207bb12f1048	missing
d069409f-d69d-43e1-a246-398f7fb162f2	8ce92f46-db6f-4763-802e-e7769c3eb932	8395b6d4-27fe-48e1-8565-51a07c84774d	missing
af25c443-977b-445d-9ff6-5fed8542da06	8ce92f46-db6f-4763-802e-e7769c3eb932	13677961-9241-43f2-aa67-54bf1c34953e	missing
27f3a9c6-2ecf-4307-9a4a-73415ea2442d	8ce92f46-db6f-4763-802e-e7769c3eb932	d6e5c05d-7d11-4bb9-8c2e-409ee757a657	missing
b828815a-216e-4b65-9145-9c82d4e4e4f7	8ce92f46-db6f-4763-802e-e7769c3eb932	64abba07-acc6-4036-84b0-d6c379279568	missing
ff21f2aa-db62-4dd5-911f-8569d626262c	8ce92f46-db6f-4763-802e-e7769c3eb932	673b5ac8-9560-4859-9c2d-749d8c810591	missing
b0088bad-bd33-4051-9d3c-49d2dd29072f	8ce92f46-db6f-4763-802e-e7769c3eb932	597eca4f-c7f9-4835-b904-c9ea43315204	missing
2e9a7961-df31-4e02-9025-4c5ae751e377	8ce92f46-db6f-4763-802e-e7769c3eb932	8c9481b7-282f-4b13-8ab6-591c47d84612	missing
47084060-ab45-4534-b898-8dbd069de6a6	8ce92f46-db6f-4763-802e-e7769c3eb932	69c30758-feac-47d2-a027-b4af60827aba	missing
2fa5ed6e-ce44-4184-9471-d40f25b88dcc	8ce92f46-db6f-4763-802e-e7769c3eb932	4ab053fe-bc88-4b8f-acc1-1960b371793a	missing
aa857bf3-9359-4b40-86aa-4d795d7665f7	8ce92f46-db6f-4763-802e-e7769c3eb932	3819722e-6978-4366-8553-83789a14b994	missing
ab1c92b1-f882-41e0-a076-bf568013102f	8ce92f46-db6f-4763-802e-e7769c3eb932	62eece0a-11b2-480d-b077-5a74074109f0	missing
1bde133c-4faa-48d7-973a-8ef8efef157e	8ce92f46-db6f-4763-802e-e7769c3eb932	4b6f2b41-edc7-4baa-9268-d88f36f33ed5	missing
60990fc7-c58e-42e5-b5ec-068cbe1b89e3	8ce92f46-db6f-4763-802e-e7769c3eb932	622e1a7f-0c4e-4822-9dc7-5314b204f0e2	missing
a50bf59e-03f5-4dda-a686-6e4526132540	8ce92f46-db6f-4763-802e-e7769c3eb932	7614fba0-2ae5-4e80-8a5a-404dd299fb70	missing
bc1d59b0-747f-4f6c-a6b0-4e7874d96d12	8ce92f46-db6f-4763-802e-e7769c3eb932	e39db6dc-50cf-4dd4-a8bb-80000c7f497d	missing
10d9ec9f-f0f5-487e-9af0-2c2d387b6db9	8ce92f46-db6f-4763-802e-e7769c3eb932	508c33f1-cd93-4ff3-8a73-5c1a6eb2f53e	missing
be77b779-a8a1-47aa-a226-ba00e488f54c	8ce92f46-db6f-4763-802e-e7769c3eb932	63f012e6-d4de-4ee5-9cd3-4941918c6d5b	missing
a6297140-536d-4f99-adfc-50cb46d4f329	8ce92f46-db6f-4763-802e-e7769c3eb932	fc75eea8-e5ff-43da-84fd-3f473945aabe	missing
f946d7b0-4a8a-4fe2-8744-fe4f408e66ee	8ce92f46-db6f-4763-802e-e7769c3eb932	2e070b00-bc71-4904-947c-f2fbff690f50	missing
92d33df8-fca4-4e16-8ad3-9b1e60075ae8	8ce92f46-db6f-4763-802e-e7769c3eb932	311aaa43-4c8f-4ebe-ba9c-729f461c0747	missing
b2518345-f948-41dc-a265-648ba72fef0c	8ce92f46-db6f-4763-802e-e7769c3eb932	f69b5831-7ea4-4a67-ac0b-40aba3dd58b1	missing
3b998346-d507-44c3-9fcf-c2c3a0281a7b	8ce92f46-db6f-4763-802e-e7769c3eb932	37d0be25-d044-4bf5-87be-58c6398e8e69	missing
e47bd794-226e-4bc3-8287-8bc547f968a4	8ce92f46-db6f-4763-802e-e7769c3eb932	d6ba4cf3-e453-40fd-b17b-3d90b4c40bc4	missing
af2aa0f1-6bda-468e-a61a-13f7d2ddd79c	8ce92f46-db6f-4763-802e-e7769c3eb932	5e3b5250-e777-4b24-99c1-b928b84d2553	missing
\.


--
-- Data for Name: stocktakes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktakes (id, code, warehouse_id, scope_type, scope_ids, status, started_at, completed_at, created_by, note) FROM stdin;
12bc28a6-9619-4e9b-8082-ef3e0fda3235	1	6e5abfe0-375e-4727-bd9d-4b1ef287b502	all	\N	completed	2026-06-26 09:34:27.362884+00	2026-06-26 09:34:32.932664+00	52bd64bc-8dec-4d06-8739-2302edfc1d2f	\N
ef3e051a-a0d0-4f54-aaae-85ac528ed3d1	KK-2026-0001	6e5abfe0-375e-4727-bd9d-4b1ef287b502	all	\N	in_progress	2026-07-08 06:53:02.175823+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	Test kiểm kê
8ce92f46-db6f-4763-802e-e7769c3eb932	KK-2026-0002	6e5abfe0-375e-4727-bd9d-4b1ef287b502	all	\N	completed	2026-07-08 06:53:47.946717+00	2026-07-08 06:54:17.717669+00	560f0b94-c648-4d28-a6c6-7560f54b6cf7	Test kiểm kê
e906c402-3041-48d3-8db6-9a56325c06ac	KK-2026-0001	6e5abfe0-375e-4727-bd9d-4b1ef287b502	all	\N	in_progress	2026-07-08 07:26:14.042669+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	Test auto code
6234b3a1-9fbc-4964-b34c-38a0dfbbface	KK-2026-0002	6e5abfe0-375e-4727-bd9d-4b1ef287b502	all	\N	in_progress	2026-07-08 07:26:14.067866+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	\N
\.


--
-- Data for Name: template_field_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_field_mappings (id, template_id, template_variable, source_type, database_field, bitrix_field, is_required) FROM stdin;
\.


--
-- Data for Name: transfer_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transfer_order_lines (id, transfer_order_id, variant_id, quantity, line_order, note) FROM stdin;
ed1d2b69-4b2a-4fea-bec8-2726cce0453c	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	c24ef883-9913-4e81-9125-e6e0d454fe48	2	1	\N
4d560d81-5b96-46f6-b4bf-edcbec8cede5	61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	a262e290-3061-40fd-83e5-56671e1b0325	5	2	\N
52ca84b7-930f-4a88-ac8f-fc508c1594b1	186faa46-3be2-4dd0-89f7-b646af383cc9	c24ef883-9913-4e81-9125-e6e0d454fe48	1	1	\N
aff0b77a-92d9-48ca-8faf-055c70c85aed	2cf3d632-2b81-49b3-8a3f-57aaf44adcc8	c24ef883-9913-4e81-9125-e6e0d454fe48	1	1	\N
20e5d6f6-f003-4ad2-9011-a39613ebe617	6972696b-fb41-44c3-8d2b-8b3be7c7b694	c24ef883-9913-4e81-9125-e6e0d454fe48	1	1	\N
9ff79e91-5d86-41f8-a520-b1f5bf8afdf1	5f6b1f62-8f24-4c79-9624-a4c5ce27b729	c24ef883-9913-4e81-9125-e6e0d454fe48	1	1	\N
2892e31d-5fe7-4f85-bd95-3f387e027a57	fb6b9f94-fa57-4b04-a6fb-5b120b28f588	c24ef883-9913-4e81-9125-e6e0d454fe48	1	1	\N
7b9fd4fd-af32-4315-aac6-b306e0eb686a	f828aa8e-a93e-41d0-8999-ce927525896f	c24ef883-9913-4e81-9125-e6e0d454fe48	1	1	\N
\.


--
-- Data for Name: transfer_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transfer_orders (id, code, transfer_type, from_warehouse_id, to_warehouse_id, status, approved_by, approved_at, completed_at, note, created_by, created_at, updated_at) FROM stdin;
61c4bbc3-9837-47c3-aa2d-7a8c9f8579e9	CK-2026-0001	transfer	6e5abfe0-375e-4727-bd9d-4b1ef287b502	616e07b2-1060-4e66-8163-22c42e5a7c1d	completed	\N	\N	2026-07-08 06:45:18.93571+00	Test chuyển kho	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:00.12672+00	2026-07-08 06:45:18.93571+00
186faa46-3be2-4dd0-89f7-b646af383cc9	CK-2026-0002	transfer	6e5abfe0-375e-4727-bd9d-4b1ef287b502	616e07b2-1060-4e66-8163-22c42e5a7c1d	cancelled	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:45:42.200376+00	2026-07-08 06:45:42.233531+00
2cf3d632-2b81-49b3-8a3f-57aaf44adcc8	CK-2026-0003	demo_in	5538a379-9cd9-4fb4-9c95-3ce5b201f86d	616e07b2-1060-4e66-8163-22c42e5a7c1d	draft	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:49:03.054428+00	2026-07-08 06:49:03.054428+00
6972696b-fb41-44c3-8d2b-8b3be7c7b694	CK-2026-0004	demo_in	5538a379-9cd9-4fb4-9c95-3ce5b201f86d	616e07b2-1060-4e66-8163-22c42e5a7c1d	draft	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:49:27.744792+00	2026-07-08 06:49:27.744792+00
5f6b1f62-8f24-4c79-9624-a4c5ce27b729	CK-2026-0005	warranty_in	eed07910-c6a2-4702-bb0a-59d3a47f3bdf	6e5abfe0-375e-4727-bd9d-4b1ef287b502	completed	\N	\N	2026-07-08 06:51:17.601761+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:17.577443+00	2026-07-08 06:51:17.601761+00
fb6b9f94-fa57-4b04-a6fb-5b120b28f588	CK-2026-0006	demo_in	5538a379-9cd9-4fb4-9c95-3ce5b201f86d	616e07b2-1060-4e66-8163-22c42e5a7c1d	draft	\N	\N	\N	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:51:33.202585+00	2026-07-08 06:51:33.202585+00
f828aa8e-a93e-41d0-8999-ce927525896f	CK-2026-0007	demo_in	5538a379-9cd9-4fb4-9c95-3ce5b201f86d	616e07b2-1060-4e66-8163-22c42e5a7c1d	completed	\N	\N	2026-07-08 06:52:02.23399+00	\N	560f0b94-c648-4d28-a6c6-7560f54b6cf7	2026-07-08 06:52:02.203178+00	2026-07-08 06:52:02.23399+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, phone, password_hash, role_id, is_active, created_at, updated_at) FROM stdin;
560f0b94-c648-4d28-a6c6-7560f54b6cf7	Admin	admin@dns.local	\N	$2b$10$7BotNUPAbRI0kbmtxiXd4.B/JTnOiifbhWPZ9rjk7Q6HwkcC7Ud/G	09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	t	2026-06-22 04:23:57.650894+00	2026-06-22 04:23:57.650894+00
52bd64bc-8dec-4d06-8739-2302edfc1d2f	Khai Nguyen	khainq@dnsvn.com	\N	$2b$10$7BotNUPAbRI0kbmtxiXd4.B/JTnOiifbhWPZ9rjk7Q6HwkcC7Ud/G	09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	t	2026-06-26 08:18:37.732711+00	2026-06-26 08:18:37.732711+00
0c1883bf-9b06-473c-b7db-90538d313a90	Admin	admin@dns.vn	\N	$2b$10$wtZGjxVVNwRlZRLFW5JGX.Kswl9APkL4FRFxrZMlVETjBdf.YZZSi	09db64ba-6b63-41bb-ad2a-ced2fe83ae6a	t	2026-06-30 01:26:36.22993+00	2026-06-30 01:26:36.22993+00
\.


--
-- Data for Name: variant_attribute_def_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_attribute_def_products (attribute_def_id, product_id) FROM stdin;
e4d9ad52-f1ce-4810-b598-c348c39544f0	7ab3fb88-b001-4ec2-b2dd-49012f23e43b
\.


--
-- Data for Name: variant_attribute_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_attribute_defs (id, name, unit, options, applies_to, is_active, created_at, field_type) FROM stdin;
e4d9ad52-f1ce-4810-b598-c348c39544f0	Tiêu cự	mm	{2.8,4.0}	product	t	2026-06-30 02:37:46.621381+00	select
\.


--
-- Data for Name: variant_attribute_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_attribute_values (id, variant_id, attribute_def_id, value, include_in_sku) FROM stdin;
\.


--
-- Data for Name: variant_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_suppliers (id, variant_id, company_id, supplier_sku, supplier_price, lead_time_days, is_preferred) FROM stdin;
\.


--
-- Data for Name: variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variants (id, product_id, sku, name, unit, cost_price, sale_price, currency, weight_kg, warranty_months, reorder_point, is_active, created_at, updated_at) FROM stdin;
61864aac-3c72-4a1f-b755-30eeb3fbae9a	0a41ef4c-0fa8-4bcf-a9ec-8f231886d176	TEST-001	Test variant	cái	\N	\N	VND	\N	\N	0	f	2026-06-26 03:30:24.657847+00	2026-06-26 08:58:13.166291+00
26f8b5dc-2b7a-4f37-b2d0-3fb2968bcba9	7ab3fb88-b001-4ec2-b2dd-49012f23e43b	RAM-KS-24P	RAM kingston 8G 3200	Cái	0.00	0.00	VND	0.000	0	0	t	2026-06-26 09:02:11.809785+00	2026-06-30 01:28:04.252095+00
803a93f4-3dff-4d60-b448-094e08e9fac4	7ab3fb88-b001-4ec2-b2dd-49012f23e43b	RAM-KS-8P	RAM-KS-8P	Cái	0.00	0.00	VND	0.000	0	0	t	2026-06-26 09:01:42.235149+00	2026-06-30 02:01:43.174692+00
c24ef883-9913-4e81-9125-e6e0d454fe48	6e519e2e-ca7b-4388-8668-fe22d28df77b	NSW-CWF-SG350-28P	Cisco SG350 28P	Cái	\N	\N	VND	\N	\N	0	t	2026-07-01 03:16:08.482923+00	2026-07-01 03:16:08.482923+00
a262e290-3061-40fd-83e5-56671e1b0325	bfd8c32d-2515-436e-b1b3-e5bc79b81f4c	CAP-TEST-1M	Cáp Cat6 1m	Cuộn	\N	\N	VND	\N	\N	0	t	2026-07-08 03:15:42.426337+00	2026-07-08 03:15:42.426337+00
9aa71322-6daa-4446-85fc-7e6eee902cfd	6735ac31-0334-4c13-9276-e15a617f0620	BDL-SW-CAP-01	SG350-28P + Cáp Cat6 x2	Cái	\N	12500000.00	VND	\N	\N	0	t	2026-07-08 08:03:23.631355+00	2026-07-08 08:03:23.631355+00
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, code, name, type, address, description, manager_id, is_active, created_at, updated_at) FROM stdin;
6e5abfe0-375e-4727-bd9d-4b1ef287b502	1	Kho chính	physical	\N	\N	\N	t	2026-06-25 08:24:47.00823+00	2026-06-25 08:24:47.00823+00
61fea610-8b23-4ddf-8f96-05d678873fa0	2	Kho demo	virtual	\N	\N	\N	t	2026-06-26 08:28:44.461971+00	2026-06-26 08:28:44.461971+00
616e07b2-1060-4e66-8163-22c42e5a7c1d	WH-WF-01	Kho Workflow Test	physical	\N	\N	\N	t	2026-07-01 03:15:08.023156+00	2026-07-01 03:15:08.023156+00
7a2d9cf6-ed2e-4f58-82c9-c2505c8c4a79	WH-WF-02	Kho Workflow Test	physical	\N	\N	\N	t	2026-07-01 03:16:08.466715+00	2026-07-01 03:16:08.466715+00
5538a379-9cd9-4fb4-9c95-3ce5b201f86d	WH-DEMO	Kho Demo (Cho mượn)	virtual	\N	\N	\N	t	2026-07-08 06:47:23.664919+00	2026-07-08 06:47:23.664919+00
eed07910-c6a2-4702-bb0a-59d3a47f3bdf	WH-BH	Kho Bảo hành	virtual	\N	\N	\N	t	2026-07-08 06:47:23.664919+00	2026-07-08 06:47:23.664919+00
da8d5125-8b12-4e17-8c6e-9a4aaa1b926a	WH-QC	Kho Chờ QC	virtual	\N	\N	\N	t	2026-07-08 06:47:23.664919+00	2026-07-08 06:47:23.664919+00
ac43260b-6ffb-4fde-8d49-6c0898071c60	WH-SN	Kho Chờ nhập SN	virtual	\N	\N	\N	t	2026-07-08 06:47:23.664919+00	2026-07-08 06:47:23.664919+00
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 14, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: bitrix_field_mappings bitrix_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitrix_field_mappings
    ADD CONSTRAINT bitrix_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: bitrix_field_mappings bitrix_field_mappings_quotation_field_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitrix_field_mappings
    ADD CONSTRAINT bitrix_field_mappings_quotation_field_key UNIQUE (quotation_field);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_short_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_short_code_key UNIQUE (short_code);


--
-- Name: bundle_items bundle_items_bundle_variant_id_item_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_variant_id_item_variant_id_key UNIQUE (bundle_variant_id, item_variant_id);


--
-- Name: bundle_items bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_short_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_short_code_key UNIQUE (short_code);


--
-- Name: companies companies_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_code_key UNIQUE (code);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_types company_types_company_id_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_company_id_type_key UNIQUE (company_id, type);


--
-- Name: company_types company_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: custom_fields custom_fields_object_type_field_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_object_type_field_name_key UNIQUE (object_type, field_name);


--
-- Name: custom_fields custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_pkey PRIMARY KEY (id);


--
-- Name: delivery_order_lines delivery_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_pkey PRIMARY KEY (id);


--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);


--
-- Name: document_sequences document_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_sequences
    ADD CONSTRAINT document_sequences_pkey PRIMARY KEY (doc_type, year);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: export_types export_types_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_types
    ADD CONSTRAINT export_types_key_key UNIQUE (key);


--
-- Name: export_types export_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_types
    ADD CONSTRAINT export_types_pkey PRIMARY KEY (id);


--
-- Name: field_values field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT field_values_pkey PRIMARY KEY (id);


--
-- Name: import_types import_types_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_types
    ADD CONSTRAINT import_types_key_key UNIQUE (key);


--
-- Name: import_types import_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_types
    ADD CONSTRAINT import_types_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_variant_id_warehouse_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_variant_id_warehouse_id_key UNIQUE (variant_id, warehouse_id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_key_key UNIQUE (key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_lines purchase_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quotation_line_items quotation_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_pkey PRIMARY KEY (id);


--
-- Name: quotation_sections quotation_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_sections
    ADD CONSTRAINT quotation_sections_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: receipt_lines receipt_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: reserved_items reserved_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: serial_numbers serial_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_pkey PRIMARY KEY (id);


--
-- Name: serial_numbers serial_numbers_serial_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_serial_no_key UNIQUE (serial_no);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stocktake_lines stocktake_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_lines
    ADD CONSTRAINT stocktake_lines_pkey PRIMARY KEY (id);


--
-- Name: stocktake_results stocktake_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_results
    ADD CONSTRAINT stocktake_results_pkey PRIMARY KEY (id);


--
-- Name: stocktake_results stocktake_results_stocktake_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_results
    ADD CONSTRAINT stocktake_results_stocktake_id_key UNIQUE (stocktake_id);


--
-- Name: stocktake_serials stocktake_serials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_pkey PRIMARY KEY (id);


--
-- Name: stocktake_serials stocktake_serials_stocktake_id_serial_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_stocktake_id_serial_id_key UNIQUE (stocktake_id, serial_id);


--
-- Name: stocktakes stocktakes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktakes
    ADD CONSTRAINT stocktakes_pkey PRIMARY KEY (id);


--
-- Name: template_field_mappings template_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_field_mappings
    ADD CONSTRAINT template_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: transfer_order_lines transfer_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_pkey PRIMARY KEY (id);


--
-- Name: transfer_orders transfer_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_def_products variant_attribute_def_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_def_products
    ADD CONSTRAINT variant_attribute_def_products_pkey PRIMARY KEY (attribute_def_id, product_id);


--
-- Name: variant_attribute_defs variant_attribute_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_defs
    ADD CONSTRAINT variant_attribute_defs_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_values variant_attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_values variant_attribute_values_variant_id_attribute_def_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_attribute_def_id_unique UNIQUE (variant_id, attribute_def_id);


--
-- Name: variant_suppliers variant_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_suppliers
    ADD CONSTRAINT variant_suppliers_pkey PRIMARY KEY (id);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: variants variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_sku_key UNIQUE (sku);


--
-- Name: warehouses warehouses_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_code_key UNIQUE (code);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_delivery_orders_quotation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_orders_quotation_id ON public.delivery_orders USING btree (quotation_id);


--
-- Name: idx_delivery_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_orders_status ON public.delivery_orders USING btree (status);


--
-- Name: idx_do_lines_delivery_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_do_lines_delivery_order_id ON public.delivery_order_lines USING btree (delivery_order_id);


--
-- Name: idx_field_values_object; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_field_values_object ON public.field_values USING btree (object_type, object_id);


--
-- Name: idx_movements_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movements_created ON public.stock_movements USING btree (created_at);


--
-- Name: idx_movements_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movements_ref ON public.stock_movements USING btree (ref_document_type, ref_document_id);


--
-- Name: idx_movements_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movements_variant ON public.stock_movements USING btree (variant_id, warehouse_id);


--
-- Name: idx_po_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_company_id ON public.purchase_orders USING btree (company_id);


--
-- Name: idx_po_lines_purchase_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_lines_purchase_order_id ON public.purchase_order_lines USING btree (purchase_order_id);


--
-- Name: idx_po_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_po_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_qli_quotation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qli_quotation_id ON public.quotation_line_items USING btree (quotation_id);


--
-- Name: idx_quotations_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotations_company_id ON public.quotations USING btree (company_id);


--
-- Name: idx_quotations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotations_status ON public.quotations USING btree (status);


--
-- Name: idx_receipt_lines_po_line_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipt_lines_po_line_id ON public.receipt_lines USING btree (po_line_id);


--
-- Name: idx_receipt_lines_receipt_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipt_lines_receipt_id ON public.receipt_lines USING btree (receipt_id);


--
-- Name: idx_reserved_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reserved_source ON public.reserved_items USING btree (source_type, source_id);


--
-- Name: idx_reserved_variant_wh; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reserved_variant_wh ON public.reserved_items USING btree (variant_id, warehouse_id);


--
-- Name: idx_sn_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sn_status ON public.serial_numbers USING btree (status);


--
-- Name: idx_sn_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sn_variant_id ON public.serial_numbers USING btree (variant_id);


--
-- Name: idx_sn_warehouse_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sn_warehouse_id ON public.serial_numbers USING btree (warehouse_id);


--
-- Name: bundle_items bundle_items_bundle_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_variant_id_fkey FOREIGN KEY (bundle_variant_id) REFERENCES public.variants(id);


--
-- Name: bundle_items bundle_items_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.variants(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: company_types company_types_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: delivery_order_lines delivery_order_lines_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.variants(id);


--
-- Name: delivery_order_lines delivery_order_lines_delivery_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES public.delivery_orders(id) ON DELETE CASCADE;


--
-- Name: delivery_order_lines delivery_order_lines_quotation_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_quotation_line_item_id_fkey FOREIGN KEY (quotation_line_item_id) REFERENCES public.quotation_line_items(id);


--
-- Name: delivery_order_lines delivery_order_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: delivery_orders delivery_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: delivery_orders delivery_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: delivery_orders delivery_orders_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: delivery_orders delivery_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: delivery_orders delivery_orders_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);


--
-- Name: delivery_orders delivery_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: document_templates document_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: field_values field_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT field_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.custom_fields(id);


--
-- Name: inventory inventory_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: inventory inventory_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: purchase_order_lines purchase_order_lines_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: purchase_orders purchase_orders_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotation_line_items quotation_line_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.variants(id);


--
-- Name: quotation_line_items quotation_line_items_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: quotation_line_items quotation_line_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.quotation_sections(id) ON DELETE CASCADE;


--
-- Name: quotation_line_items quotation_line_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: quotation_sections quotation_sections_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotation_sections
    ADD CONSTRAINT quotation_sections_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: quotations quotations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: quotations quotations_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: quotations quotations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotations quotations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: receipt_lines receipt_lines_po_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_po_line_id_fkey FOREIGN KEY (po_line_id) REFERENCES public.purchase_order_lines(id);


--
-- Name: receipt_lines receipt_lines_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE;


--
-- Name: receipt_lines receipt_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: receipts receipts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: receipts receipts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: receipts receipts_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: receipts receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: receipts receipts_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: receipts receipts_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: reserved_items reserved_items_quotation_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_quotation_line_item_id_fkey FOREIGN KEY (quotation_line_item_id) REFERENCES public.quotation_line_items(id);


--
-- Name: reserved_items reserved_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: reserved_items reserved_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: serial_numbers serial_numbers_delivery_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_delivery_line_id_fkey FOREIGN KEY (delivery_line_id) REFERENCES public.delivery_order_lines(id);


--
-- Name: serial_numbers serial_numbers_receipt_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_receipt_line_id_fkey FOREIGN KEY (receipt_line_id) REFERENCES public.receipt_lines(id);


--
-- Name: serial_numbers serial_numbers_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: serial_numbers serial_numbers_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_serial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_serial_id_fkey FOREIGN KEY (serial_id) REFERENCES public.serial_numbers(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: stock_movements stock_movements_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stocktake_lines stocktake_lines_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_lines
    ADD CONSTRAINT stocktake_lines_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktakes(id) ON DELETE CASCADE;


--
-- Name: stocktake_lines stocktake_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_lines
    ADD CONSTRAINT stocktake_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: stocktake_results stocktake_results_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_results
    ADD CONSTRAINT stocktake_results_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktakes(id);


--
-- Name: stocktake_serials stocktake_serials_serial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_serial_id_fkey FOREIGN KEY (serial_id) REFERENCES public.serial_numbers(id);


--
-- Name: stocktake_serials stocktake_serials_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktakes(id) ON DELETE CASCADE;


--
-- Name: stocktakes stocktakes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktakes
    ADD CONSTRAINT stocktakes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stocktakes stocktakes_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktakes
    ADD CONSTRAINT stocktakes_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: template_field_mappings template_field_mappings_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_field_mappings
    ADD CONSTRAINT template_field_mappings_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.document_templates(id) ON DELETE CASCADE;


--
-- Name: transfer_order_lines transfer_order_lines_transfer_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_transfer_order_id_fkey FOREIGN KEY (transfer_order_id) REFERENCES public.transfer_orders(id) ON DELETE CASCADE;


--
-- Name: transfer_order_lines transfer_order_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: transfer_orders transfer_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: transfer_orders transfer_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: transfer_orders transfer_orders_from_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_from_warehouse_id_fkey FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: transfer_orders transfer_orders_to_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_to_warehouse_id_fkey FOREIGN KEY (to_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: variant_attribute_def_products variant_attribute_def_products_attribute_def_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_def_products
    ADD CONSTRAINT variant_attribute_def_products_attribute_def_id_foreign FOREIGN KEY (attribute_def_id) REFERENCES public.variant_attribute_defs(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_def_products variant_attribute_def_products_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_def_products
    ADD CONSTRAINT variant_attribute_def_products_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_attribute_def_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_attribute_def_id_foreign FOREIGN KEY (attribute_def_id) REFERENCES public.variant_attribute_defs(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_variant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_foreign FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;


--
-- Name: variant_suppliers variant_suppliers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_suppliers
    ADD CONSTRAINT variant_suppliers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: variant_suppliers variant_suppliers_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_suppliers
    ADD CONSTRAINT variant_suppliers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: variants variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: warehouses warehouses_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict iS4aVqo09BiWDx7CaO7adyypVwG8YvK7B3WdlaMAoFfxooEVKgUst2sn0hosorT

