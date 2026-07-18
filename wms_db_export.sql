--
-- PostgreSQL database dump
--

\restrict bBEgbQmbYKG23NuLh40dNg9c4dXmXvchsyqKqX0Qkn8ySHgYnqphvzUibikGMmD

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
    short_code text,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL
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
    ref_document_type text,
    ref_document_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    reason text,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
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
    brand_id uuid,
    model_number text,
    category_id uuid,
    product_type text NOT NULL,
    description text,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
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
    po_line_id uuid,
    quantity integer NOT NULL,
    qty_remaining integer,
    cost_price numeric(15,2) NOT NULL,
    manufacturer_warranty_months integer,
    line_order integer DEFAULT 0 NOT NULL,
    note text,
    customer_warranty_months integer,
    manufacturer_warranty_start timestamp with time zone,
    CONSTRAINT receipt_lines_check CHECK (((qty_remaining IS NULL) OR ((qty_remaining >= 0) AND (qty_remaining <= quantity)))),
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
    po_id uuid,
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
    from_warehouse_id uuid,
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
    is_default boolean DEFAULT false NOT NULL,
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
825f1c33-0421-48b2-9d44-eb4765b0ee76	Sam Sung	SS	t
3c68373a-d113-4807-9fa0-f2643c703183	Huawei	HW	t
030bae1f-d6f4-4b28-88b8-adfbfe44777e	Microsoft	MS	t
\.


--
-- Data for Name: bundle_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bundle_items (id, bundle_variant_id, item_variant_id, quantity) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, short_code, parent_id, is_active) FROM stdin;
6c2a3f74-5a05-4481-94d2-0d015b916a28	Camera	CAM	\N	t
dcd2bb3b-7bf8-430d-84f1-fb912004de7f	Switch	SW	\N	t
4dbd0c15-9e94-439d-87a0-e0ddc4d6140c	Camera IP	CAM IP	6c2a3f74-5a05-4481-94d2-0d015b916a28	t
976b9b18-a60c-498e-b445-c41e2b42a4e3	Switch L2	SW L2	dcd2bb3b-7bf8-430d-84f1-fb912004de7f	t
c16af253-fa18-4734-82ca-4a3902f09470	Dây mạng	NC	\N	t
d1fb006a-6ac9-41ae-8461-df58a18fab8c	Dây mạng CAT5	NC CAT5	c16af253-fa18-4734-82ca-4a3902f09470	t
56e59864-e751-4944-92c1-f8509e945182	Microsoft 365 Standard	MS365 STD	\N	f
d217afd0-9a41-47b0-8754-8b462160e6cd	License 	LCS	\N	t
f7b19d48-81d3-48cb-a893-ee4657242a38	Service 	SV	\N	t
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, code, name, tax_code, country, address, phone, email, bank_account, bank_name, bitrix_company_id, is_active, note, created_at, updated_at) FROM stdin;
55a905ad-a29e-4e9e-a4a8-9b891b78ce81	CTY-0001	Mstar	\N	VN	\N	\N	\N	\N	\N	\N	t	\N	2026-07-09 02:59:56.83834+00	2026-07-09 02:59:56.83834+00
\.


--
-- Data for Name: company_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_types (id, company_id, type) FROM stdin;
28924f86-bc7b-44e4-b404-1bd8a5a50397	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	supplier
e1c325b9-0ca6-4e1f-adc8-473bec04210f	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	customer
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, company_id, full_name, "position", phone, email, is_primary, bitrix_contact_id, note) FROM stdin;
f5dd8819-fa1d-4edf-ac0d-ca7753522c80	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	Khai Nguyen	\N	0944485438	khainq@dnsvn.com	t	\N	\N
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
259e64e6-0698-45e4-8dec-d0bc963deb30	4cabe069-3c68-4f21-a7ae-a8db3188af5a	ddffeb07-5197-4b93-86c4-a31e68e85412	1	\N	b9470ab3-6223-48b7-b590-edb339b99685	1	\N	\N	\N
7aae0768-ff43-4f1d-b565-3ae9d05ef602	08f26a2d-0532-42f5-9f1a-aeba3f192b68	7ece4eee-813f-4181-bada-2c9802a8de4b	1	\N	\N	1	\N	2026-07-09 17:00:00+00	\N
a651cdd6-4e23-4520-b8d4-81afc0328ed6	c07cf61a-43d8-40d6-967b-f72a3b8e2eaf	ddffeb07-5197-4b93-86c4-a31e68e85412	1	\N	b9470ab3-6223-48b7-b590-edb339b99685	1	\N	\N	\N
cbb7b92c-80b4-42a7-b7a1-ed51d17c2493	7f6401d1-d39e-4c00-a344-df69247c567d	d047e5e2-1725-4a46-ac05-18263fabce06	1	\N	\N	1	\N	2026-07-17 17:00:00+00	\N
eaf1cd7d-c5fb-4f41-b128-32327341ba5e	b9ff5d75-095f-407c-9531-4e578a675a83	d047e5e2-1725-4a46-ac05-18263fabce06	1	\N	\N	1	\N	\N	\N
6d28a919-719e-4f45-bedf-9710e23b08ba	b9ff5d75-095f-407c-9531-4e578a675a83	caa60f5d-eb8d-4155-84be-2e18ae9b1ef4	100	\N	\N	2	\N	\N	\N
eb5089d8-269d-470b-9481-5249d7251eff	aa5c99a7-08bf-46fe-8c1c-8bdd0d62379d	732b44fc-6143-4719-962c-7f991e8f7277	10	\N	\N	1	\N	\N	\N
0fb99725-b6ce-496c-b4fc-1bdf65a28276	c7e713d8-c006-4eff-a6c7-9540f6eb1478	ddffeb07-5197-4b93-86c4-a31e68e85412	2	\N	\N	1	\N	\N	\N
\.


--
-- Data for Name: delivery_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_orders (id, code, export_type, company_id, contact_id, warehouse_id, quotation_id, ref_document_type, ref_document_id, status, approved_by, approved_at, completed_at, reason, note, created_by, created_at, updated_at) FROM stdin;
4cabe069-3c68-4f21-a7ae-a8db3188af5a	XK-2026-0001	sale	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	f5dd8819-fa1d-4edf-ac0d-ca7753522c80	70e4111c-5338-4898-9ac3-ca4d01cccabd	2efafe96-21de-451b-9fa0-3c5e765773f5	\N	\N	cancelled	\N	\N	\N	\N	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 04:59:03.937984+00	2026-07-10 04:59:18.706993+00
08f26a2d-0532-42f5-9f1a-aeba3f192b68	XK-2026-0002	sale_direct	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	70e4111c-5338-4898-9ac3-ca4d01cccabd	\N	\N	\N	completed	\N	\N	2026-07-10 06:49:55.945597+00	\N	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 06:49:44.687642+00	2026-07-10 06:49:55.945597+00
c07cf61a-43d8-40d6-967b-f72a3b8e2eaf	XK-2026-0003	sale	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	e1583f4b-2b34-42b4-8068-89de98f06277	2efafe96-21de-451b-9fa0-3c5e765773f5	\N	\N	completed	\N	\N	2026-07-10 07:55:35.70168+00	\N	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 07:53:55.233001+00	2026-07-10 07:55:35.70168+00
7f6401d1-d39e-4c00-a344-df69247c567d	XK-2026-0004	sale_direct	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	70e4111c-5338-4898-9ac3-ca4d01cccabd	\N	\N	\N	draft	\N	\N	\N	\N	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 09:07:17.71554+00	2026-07-10 09:07:17.71554+00
aa5c99a7-08bf-46fe-8c1c-8bdd0d62379d	XK-2026-0006	sale_direct	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	e1583f4b-2b34-42b4-8068-89de98f06277	\N	\N	\N	completed	\N	\N	2026-07-10 09:33:06.506397+00	\N	Test DO tạo từ API	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 09:32:35.955335+00	2026-07-10 09:33:06.506397+00
c7e713d8-c006-4eff-a6c7-9540f6eb1478	XK-2026-0007	sale_direct	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	e1583f4b-2b34-42b4-8068-89de98f06277	\N	\N	\N	completed	\N	\N	2026-07-10 09:36:26.972569+00	\N	Test xuất dịch vụ	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 09:36:06.995188+00	2026-07-10 09:36:26.972569+00
b9ff5d75-095f-407c-9531-4e578a675a83	XK-2026-0005	sale_direct	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	70e4111c-5338-4898-9ac3-ca4d01cccabd	\N	\N	\N	cancelled	\N	\N	\N	\N	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 09:21:30.896456+00	2026-07-10 09:39:23.856473+00
\.


--
-- Data for Name: document_sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_sequences (doc_type, year, last_seq) FROM stdin;
company	0	1
purchase_order	2026	3
receipt	2026	8
quotation	2026	1
transfer_order	2026	1
delivery_order	2026	7
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
fa1aeec6-4eed-49a6-bb13-ed9dc8be786f	sale	Bán hàng	\N	t	customer	t	t
ac6f7016-4554-4736-a42f-f276f8ec07ca	internal	Xuất nội bộ	\N	t	none	f	t
a0dd775b-cd92-4e2b-8839-a9887eaa08d7	demo_out	Cho mượn demo	\N	t	customer	f	t
dc5717fe-365a-4ac6-a1e6-203ad5813de1	warranty_out	Gửi bảo hành	\N	t	none	f	t
90476e47-e4bf-46e1-ba97-e648c663b99e	return_out	Trả hàng về NCC	\N	t	supplier	f	t
552aa403-f8f3-4a91-b449-e09c3e0c0933	dispose	Huỷ hàng hỏng	\N	t	none	f	t
ff9dd372-c1db-4187-8e94-b40927b6f62a	adjustment	Điều chỉnh tồn kho thiếu	\N	t	none	f	t
4c09545f-84de-4293-8678-bda0525c3ade	sale_direct	Bán thẳng (không cần báo giá)	sale	f	customer	f	t
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
9fdc9d25-4886-4ecf-b524-d8d8bd9e9f99	purchase	Mua hàng từ NCC	\N	t	supplier	none	t
46cf2cb5-9baa-4c42-9404-6e1aaf547d08	return_in	Khách hàng trả lại	\N	t	customer	quotation	t
8391457d-a85c-40a0-885e-8df759ddd7b7	adjustment	Điều chỉnh tồn kho thừa	\N	t	none	stocktake_result	t
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (id, variant_id, warehouse_id, qty_on_hand, qty_reserved, avg_cost, last_updated) FROM stdin;
cb7df554-89b5-4c7d-8117-db585bb1942b	7ece4eee-813f-4181-bada-2c9802a8de4b	ffb2ceb9-845f-4a55-a84e-8ea95391d9e2	2	0	12000000.00	2026-07-09 06:41:44.613053+00
429ae5cb-e1e1-4e9a-a4ff-2ea51ebf54da	7ece4eee-813f-4181-bada-2c9802a8de4b	e1583f4b-2b34-42b4-8068-89de98f06277	2	0	0.00	2026-07-09 07:09:31.302253+00
517df0f7-7b24-4ac5-915c-1ac66207e685	732b44fc-6143-4719-962c-7f991e8f7277	70e4111c-5338-4898-9ac3-ca4d01cccabd	10	0	120000.00	2026-07-09 08:12:24.275958+00
11029871-1969-4e63-992a-c893f3bc346e	d047e5e2-1725-4a46-ac05-18263fabce06	e1583f4b-2b34-42b4-8068-89de98f06277	1	0	1000000.00	2026-07-09 10:26:40.518186+00
781f18e7-b268-4575-8681-af04a9a8dac2	7ece4eee-813f-4181-bada-2c9802a8de4b	70e4111c-5338-4898-9ac3-ca4d01cccabd	0	0	100000.00	2026-07-10 06:49:55.945597+00
b3aa4926-d29d-438e-a362-d87f0080fa3a	732b44fc-6143-4719-962c-7f991e8f7277	e1583f4b-2b34-42b4-8068-89de98f06277	90	0	100000.00	2026-07-10 09:33:06.506397+00
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
7	20260618000000_initial_schema.ts	1	2026-07-09 02:51:36.758+00
8	20260624000000_stock_movements_serial_set_null.ts	1	2026-07-09 02:51:36.764+00
9	20260624010000_custom_fields_add_variant_object_type.ts	1	2026-07-09 02:51:36.767+00
10	20260625000000_custom_fields_add_applies_to_po_line.ts	1	2026-07-09 02:51:36.778+00
11	20260626000000_document_sequences.ts	1	2026-07-09 02:51:36.786+00
12	20260629000000_warranty_split.ts	1	2026-07-09 02:51:36.791+00
13	20260629010000_receipt_line_warranty_start.ts	1	2026-07-09 02:51:36.793+00
14	20260629020000_delivery_line_customer_warranty_start.ts	1	2026-07-09 02:51:36.795+00
15	20260629030000_variant_attribute_defs.ts	1	2026-07-09 02:51:36.826+00
16	20260630000000_variant_attr_field_type.ts	1	2026-07-09 02:51:36.828+00
17	20260707000000_custom_fields_add_more_object_types.ts	1	2026-07-09 02:51:36.83+00
18	20260708000000_fix_manufacturer_warranty_end_to_timestamptz.ts	1	2026-07-09 02:51:36.852+00
19	20260708010000_seed_virtual_warehouses.ts	1	2026-07-09 02:51:36.856+00
20	20260708020000_seed_return_in_import_type.ts	1	2026-07-09 02:51:36.858+00
21	20260708030000_add_bundle_unit_qty_to_delivery_lines.ts	1	2026-07-09 02:51:36.86+00
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
0bbfa25f-b7a7-4f35-b2d0-96263815381d	quotation.create	Tạo báo giá	quotation
7fe38196-6c16-4951-86a7-e753668cfc7b	quotation.edit	Sửa báo giá	quotation
e0113301-1b38-4f2a-9db2-3bdcbdecbb70	quotation.confirm	Xác nhận báo giá	quotation
a0b00228-4237-42ad-820e-079ec8acb0f6	quotation.view	Xem báo giá	quotation
d378d6ca-b970-4137-9ef3-c27af2674550	receipt.create	Tạo phiếu nhập kho	receipt
fb689954-14a2-4b8e-b8f0-3480e2585d62	receipt.approve	Duyệt phiếu nhập kho	receipt
57960860-3283-4318-b32f-0b0657e23a09	receipt.complete	Hoàn thành phiếu nhập kho	receipt
0a602b54-102c-43d9-a654-3d235d30bbc0	receipt.view	Xem phiếu nhập kho	receipt
5b5fe0c3-3585-460f-8a9c-e483c37ff1a5	delivery.create	Tạo phiếu xuất kho	delivery
c0e2359a-8aa7-49c1-8c57-4a9b8cef7cd4	delivery.approve	Duyệt phiếu xuất kho	delivery
702ab3b1-ff8c-44d5-afc8-a2586d5893d2	delivery.complete	Hoàn thành phiếu xuất kho	delivery
5090743a-d027-4520-b054-9c499bf9dcf7	delivery.view	Xem phiếu xuất kho	delivery
37ea921c-f8d1-45cf-b150-4d4aaea15c67	transfer.create	Tạo phiếu chuyển kho	transfer
da69f708-4a12-4903-a1d4-48c43e701101	transfer.approve	Duyệt phiếu chuyển kho	transfer
9d5095b3-a1d0-4d80-a903-0fecb41be697	transfer.complete	Hoàn thành phiếu chuyển kho	transfer
def629a6-ed88-4ac3-be9f-fc2780913616	transfer.view	Xem phiếu chuyển kho	transfer
1ff0b248-31a9-4bdc-8abb-955fd6c32859	stocktake.create	Tạo kiểm kê	stocktake
07290bee-af67-4cfc-b626-b59a54bf2045	stocktake.complete	Hoàn thành kiểm kê	stocktake
9c935e77-9a49-45dc-92ee-1e35b08cd516	stocktake.view	Xem kiểm kê	stocktake
2ef56599-2061-457f-a8c9-d22cfa2bac2f	report.inventory	Xem báo cáo tồn kho	report
8ac98381-85a3-40bc-b35b-c07153d60b99	report.revenue	Xem báo cáo doanh thu	report
ed30218c-9096-4bf1-92e1-4221639dd6f3	report.view	Xem báo cáo tổng hợp	report
5ff5a394-5898-4896-a758-018ce785c51f	settings.roles	Quản lý role	settings
1ea43fe1-b95b-430d-8555-be7c7fb71cfa	settings.users	Quản lý users	settings
e64ab743-744a-4c1a-9b7c-f23275b84508	settings.warehouse	Quản lý kho	settings
5cf6bfe4-e0be-4667-ba32-5c0d01828a91	settings.products	Quản lý sản phẩm	settings
cbc5740d-6275-4df7-b6c4-ffe4990003c1	purchase_order.create	Tạo đơn mua hàng (PO)	purchase_order
ad21388b-1201-4f74-9881-803b519079b7	purchase_order.edit	Sửa đơn mua hàng (PO)	purchase_order
9b748560-936f-4591-9cff-c5090a48e70d	purchase_order.confirm	Xác nhận đơn mua hàng (PO)	purchase_order
492432ef-431a-40ec-af1d-9b3c3d449134	purchase_order.view	Xem đơn mua hàng (PO)	purchase_order
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, code, name, name_en, brand_id, model_number, category_id, product_type, description, image_url, is_active, created_at, updated_at) FROM stdin;
b5af88aa-0cf7-46d4-b73d-a19646597e43	SW-HW	Switch Huawei	\N	3c68373a-d113-4807-9fa0-f2643c703183	\N	dcd2bb3b-7bf8-430d-84f1-fb912004de7f	storable	\N	\N	t	2026-07-09 03:21:49.892785+00	2026-07-09 03:21:49.892785+00
5ce50601-3912-4fea-be1d-ea7c79c6af48	NC CAT5	Dây mạng CAT5		825f1c33-0421-48b2-9d44-eb4765b0ee76		d1fb006a-6ac9-41ae-8461-df58a18fab8c	consumable			t	2026-07-09 07:59:10.66024+00	2026-07-09 08:26:24.837735+00
96771024-eea6-4d09-9712-035477fbd8de	LCS-MS-365	License Microsoft 365 		030bae1f-d6f4-4b28-88b8-adfbfe44777e	Standard	d217afd0-9a41-47b0-8754-8b462160e6cd	consumable			t	2026-07-09 08:52:22.728273+00	2026-07-09 08:52:49.386981+00
c0c26870-c204-4055-b0be-e83d94960a57	Dịch vụ thi công dưới nước	Dịch vụ thi công dưới nước	\N	\N	\N	f7b19d48-81d3-48cb-a893-ee4657242a38	service	\N	\N	f	2026-07-10 03:12:11.128187+00	2026-07-10 03:39:57.010748+00
94af4731-cf97-4e6c-8091-d9bdf8594205	Dịch vụ lắp đặt dưới nước	Dịch vụ lắp đặt dưới nước	\N	\N	\N	f7b19d48-81d3-48cb-a893-ee4657242a38	service	\N	\N	t	2026-07-10 03:52:00.589035+00	2026-07-10 03:52:00.589035+00
b4e260e0-6832-4964-8318-807dffdb2fa2	Dịch vụ lắp đặt thiết bị	Dịch vụ lắp đặt thiết bị	\N	\N	Installation	f7b19d48-81d3-48cb-a893-ee4657242a38	service	\N	\N	f	2026-07-10 02:45:58.695191+00	2026-07-10 03:52:06.744249+00
\.


--
-- Data for Name: purchase_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_lines (id, purchase_order_id, variant_id, quantity, unit_price, manufacturer_warranty_months, line_order, note, customer_warranty_months) FROM stdin;
9eaa1b1d-1745-4ceb-96ac-54098ef82675	c718b4b7-6d2f-4515-b872-f1f8d603ebf8	7ece4eee-813f-4181-bada-2c9802a8de4b	2	12000000.00	\N	1	\N	\N
9e54b60f-5a0f-4053-93e4-b3f1f4f61671	0cbcbfda-ce2b-468e-a66f-7965cd1a323e	7ece4eee-813f-4181-bada-2c9802a8de4b	1	0.00	24	1	\N	24
3e0b8095-33f7-4cb9-887f-e328c76c5072	eacdba17-c5b7-4ce4-b951-e957e6568da8	7ece4eee-813f-4181-bada-2c9802a8de4b	1	0.00	\N	1	\N	\N
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, code, company_id, contact_id, bitrix_deal_id, status, note, created_by, created_at, updated_at) FROM stdin;
c718b4b7-6d2f-4515-b872-f1f8d603ebf8	PO-2026-0001	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	f5dd8819-fa1d-4edf-ac0d-ca7753522c80	\N	confirmed	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 06:40:38.17571+00	2026-07-09 06:41:14.652587+00
0cbcbfda-ce2b-468e-a66f-7965cd1a323e	PO-2026-0002	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	f5dd8819-fa1d-4edf-ac0d-ca7753522c80	\N	confirmed	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 06:55:59.398777+00	2026-07-09 06:56:02.824654+00
eacdba17-c5b7-4ce4-b951-e957e6568da8	PO-2026-0003	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	f5dd8819-fa1d-4edf-ac0d-ca7753522c80	\N	confirmed	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 07:09:07.839809+00	2026-07-09 07:09:10.544848+00
\.


--
-- Data for Name: quotation_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotation_line_items (id, quotation_id, section_id, variant_id, bundle_id, description, unit, quantity, unit_price, warranty, line_total, vat_percent, vat_amount, is_reserved, line_order, note) FROM stdin;
b9470ab3-6223-48b7-b590-edb339b99685	2efafe96-21de-451b-9fa0-3c5e765773f5	d48989a4-cea6-4a72-a44c-86832fb662c5	ddffeb07-5197-4b93-86c4-a31e68e85412	\N	\N	\N	1.00	1.00	10000	1.00	0.00	0.00	f	1	sdasdad
\.


--
-- Data for Name: quotation_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotation_sections (id, quotation_id, name, section_order, subtotal) FROM stdin;
d48989a4-cea6-4a72-a44c-86832fb662c5	2efafe96-21de-451b-9fa0-3c5e765773f5	fgdgd	1	1.00
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotations (id, code, company_id, contact_id, project_name, delivery_location, warehouse_id, valid_days, expired_at, bitrix_deal_id, bitrix_deal_url, bitrix_synced_at, status, subtotal, vat_total, discount, grand_total, amount_in_words, terms, created_by, created_at, updated_at) FROM stdin;
2efafe96-21de-451b-9fa0-3c5e765773f5	BG-2026-0001	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	1.00	0.00	0.00	1.00	\N	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 03:56:08.249787+00	2026-07-10 03:56:11.770076+00
\.


--
-- Data for Name: receipt_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipt_lines (id, receipt_id, variant_id, po_line_id, quantity, qty_remaining, cost_price, manufacturer_warranty_months, line_order, note, customer_warranty_months, manufacturer_warranty_start) FROM stdin;
35f81495-48d7-4290-b1e8-b27216070559	88592c93-69d3-426e-8545-b5275c959f00	7ece4eee-813f-4181-bada-2c9802a8de4b	9eaa1b1d-1745-4ceb-96ac-54098ef82675	2	2	12000000.00	0	1	\N	0	\N
005bcc36-7be3-47a2-8697-a416e9b8da3d	331d3639-977a-44b1-98f9-770a87ed4ded	7ece4eee-813f-4181-bada-2c9802a8de4b	9e54b60f-5a0f-4053-93e4-b3f1f4f61671	1	1	0.00	24	1	\N	24	2026-07-08 17:00:00+00
1b44c820-1e13-4530-87a2-3e0bb3a0ccfb	af60e66d-7dd8-4633-9be0-4923c9b2d25b	7ece4eee-813f-4181-bada-2c9802a8de4b	3e0b8095-33f7-4cb9-887f-e328c76c5072	1	1	0.00	\N	1	\N	\N	\N
4ee5a9cf-7475-4e40-88cf-e33cde93d136	95bc95f2-3f33-4940-bce6-23546a0c2993	732b44fc-6143-4719-962c-7f991e8f7277	\N	10	10	120000.00	\N	1	\N	\N	\N
859312b7-86a0-4888-bd8b-98f7fb9a55de	e7363948-c81b-41dc-b545-f315e7183d24	d047e5e2-1725-4a46-ac05-18263fabce06	\N	1	1	1000000.00	\N	1	\N	\N	\N
71777770-ac6c-44d7-8491-02e04a47ec0b	dfe2eeb6-8953-4e09-9294-043926318b0c	7ece4eee-813f-4181-bada-2c9802a8de4b	\N	1	0	100000.00	\N	1	\N	\N	\N
27ca20fd-f2c2-4f6d-b31c-8fa48c44cba2	0908e6a0-abb8-4583-9c23-7b1b891e9cef	732b44fc-6143-4719-962c-7f991e8f7277	\N	1	0	100000.00	\N	1	\N	\N	\N
51cfca48-402f-499a-be82-89329346da85	58c374d3-37cd-46b2-b747-21d06b725057	732b44fc-6143-4719-962c-7f991e8f7277	\N	99	90	100000.00	\N	1	\N	\N	\N
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipts (id, code, import_type, company_id, contact_id, warehouse_id, po_id, ref_document_type, ref_document_id, status, approved_by, approved_at, completed_at, note, created_by, created_at, updated_at) FROM stdin;
88592c93-69d3-426e-8545-b5275c959f00	NK-2026-0001	purchase	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	ffb2ceb9-845f-4a55-a84e-8ea95391d9e2	c718b4b7-6d2f-4515-b872-f1f8d603ebf8	\N	\N	completed	\N	\N	2026-07-09 06:41:44.613053+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 06:41:34.946924+00	2026-07-09 06:41:44.613053+00
331d3639-977a-44b1-98f9-770a87ed4ded	NK-2026-0002	purchase	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	e1583f4b-2b34-42b4-8068-89de98f06277	0cbcbfda-ce2b-468e-a66f-7965cd1a323e	\N	\N	completed	\N	\N	2026-07-09 06:56:22.841442+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 06:56:14.184688+00	2026-07-09 06:56:22.841442+00
af60e66d-7dd8-4633-9be0-4923c9b2d25b	NK-2026-0003	purchase	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	e1583f4b-2b34-42b4-8068-89de98f06277	eacdba17-c5b7-4ce4-b951-e957e6568da8	\N	\N	completed	\N	\N	2026-07-09 07:09:31.302253+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 07:09:19.213911+00	2026-07-09 07:09:31.302253+00
0908e6a0-abb8-4583-9c23-7b1b891e9cef	NK-2026-0004	purchase	\N	\N	e1583f4b-2b34-42b4-8068-89de98f06277	\N	\N	\N	completed	\N	\N	2026-07-09 08:07:50.786569+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 08:07:46.167027+00	2026-07-09 08:07:50.786569+00
58c374d3-37cd-46b2-b747-21d06b725057	NK-2026-0005	purchase	\N	\N	e1583f4b-2b34-42b4-8068-89de98f06277	\N	\N	\N	completed	\N	\N	2026-07-09 08:10:18.013675+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 08:10:07.561879+00	2026-07-09 08:10:18.013675+00
95bc95f2-3f33-4940-bce6-23546a0c2993	NK-2026-0006	purchase	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	70e4111c-5338-4898-9ac3-ca4d01cccabd	\N	\N	\N	completed	\N	\N	2026-07-09 08:12:24.275958+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 08:12:22.27229+00	2026-07-09 08:12:24.275958+00
e7363948-c81b-41dc-b545-f315e7183d24	NK-2026-0007	purchase	\N	\N	e1583f4b-2b34-42b4-8068-89de98f06277	\N	\N	\N	completed	\N	\N	2026-07-09 10:26:40.518186+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 10:26:36.390776+00	2026-07-09 10:26:40.518186+00
dfe2eeb6-8953-4e09-9294-043926318b0c	NK-2026-0008	purchase	\N	\N	70e4111c-5338-4898-9ac3-ca4d01cccabd	\N	\N	\N	completed	\N	\N	2026-07-09 10:40:14.90288+00	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 10:40:00.48661+00	2026-07-09 10:40:14.90288+00
\.


--
-- Data for Name: reserved_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reserved_items (id, variant_id, warehouse_id, quantity, source_type, source_id, quotation_line_item_id, created_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
24de7e5d-abde-4f4d-a079-82829a261e1e	0bbfa25f-b7a7-4f35-b2d0-96263815381d
24de7e5d-abde-4f4d-a079-82829a261e1e	7fe38196-6c16-4951-86a7-e753668cfc7b
24de7e5d-abde-4f4d-a079-82829a261e1e	e0113301-1b38-4f2a-9db2-3bdcbdecbb70
24de7e5d-abde-4f4d-a079-82829a261e1e	a0b00228-4237-42ad-820e-079ec8acb0f6
24de7e5d-abde-4f4d-a079-82829a261e1e	d378d6ca-b970-4137-9ef3-c27af2674550
24de7e5d-abde-4f4d-a079-82829a261e1e	fb689954-14a2-4b8e-b8f0-3480e2585d62
24de7e5d-abde-4f4d-a079-82829a261e1e	57960860-3283-4318-b32f-0b0657e23a09
24de7e5d-abde-4f4d-a079-82829a261e1e	0a602b54-102c-43d9-a654-3d235d30bbc0
24de7e5d-abde-4f4d-a079-82829a261e1e	5b5fe0c3-3585-460f-8a9c-e483c37ff1a5
24de7e5d-abde-4f4d-a079-82829a261e1e	c0e2359a-8aa7-49c1-8c57-4a9b8cef7cd4
24de7e5d-abde-4f4d-a079-82829a261e1e	702ab3b1-ff8c-44d5-afc8-a2586d5893d2
24de7e5d-abde-4f4d-a079-82829a261e1e	5090743a-d027-4520-b054-9c499bf9dcf7
24de7e5d-abde-4f4d-a079-82829a261e1e	37ea921c-f8d1-45cf-b150-4d4aaea15c67
24de7e5d-abde-4f4d-a079-82829a261e1e	da69f708-4a12-4903-a1d4-48c43e701101
24de7e5d-abde-4f4d-a079-82829a261e1e	9d5095b3-a1d0-4d80-a903-0fecb41be697
24de7e5d-abde-4f4d-a079-82829a261e1e	def629a6-ed88-4ac3-be9f-fc2780913616
24de7e5d-abde-4f4d-a079-82829a261e1e	1ff0b248-31a9-4bdc-8abb-955fd6c32859
24de7e5d-abde-4f4d-a079-82829a261e1e	07290bee-af67-4cfc-b626-b59a54bf2045
24de7e5d-abde-4f4d-a079-82829a261e1e	9c935e77-9a49-45dc-92ee-1e35b08cd516
24de7e5d-abde-4f4d-a079-82829a261e1e	2ef56599-2061-457f-a8c9-d22cfa2bac2f
24de7e5d-abde-4f4d-a079-82829a261e1e	8ac98381-85a3-40bc-b35b-c07153d60b99
24de7e5d-abde-4f4d-a079-82829a261e1e	ed30218c-9096-4bf1-92e1-4221639dd6f3
24de7e5d-abde-4f4d-a079-82829a261e1e	5ff5a394-5898-4896-a758-018ce785c51f
24de7e5d-abde-4f4d-a079-82829a261e1e	1ea43fe1-b95b-430d-8555-be7c7fb71cfa
24de7e5d-abde-4f4d-a079-82829a261e1e	e64ab743-744a-4c1a-9b7c-f23275b84508
24de7e5d-abde-4f4d-a079-82829a261e1e	5cf6bfe4-e0be-4667-ba32-5c0d01828a91
24de7e5d-abde-4f4d-a079-82829a261e1e	cbc5740d-6275-4df7-b6c4-ffe4990003c1
24de7e5d-abde-4f4d-a079-82829a261e1e	ad21388b-1201-4f74-9881-803b519079b7
24de7e5d-abde-4f4d-a079-82829a261e1e	9b748560-936f-4591-9cff-c5090a48e70d
24de7e5d-abde-4f4d-a079-82829a261e1e	492432ef-431a-40ec-af1d-9b3c3d449134
ef821766-67b9-4264-a4a9-2145736fba1c	e0113301-1b38-4f2a-9db2-3bdcbdecbb70
ef821766-67b9-4264-a4a9-2145736fba1c	a0b00228-4237-42ad-820e-079ec8acb0f6
ef821766-67b9-4264-a4a9-2145736fba1c	fb689954-14a2-4b8e-b8f0-3480e2585d62
ef821766-67b9-4264-a4a9-2145736fba1c	57960860-3283-4318-b32f-0b0657e23a09
ef821766-67b9-4264-a4a9-2145736fba1c	0a602b54-102c-43d9-a654-3d235d30bbc0
ef821766-67b9-4264-a4a9-2145736fba1c	c0e2359a-8aa7-49c1-8c57-4a9b8cef7cd4
ef821766-67b9-4264-a4a9-2145736fba1c	702ab3b1-ff8c-44d5-afc8-a2586d5893d2
ef821766-67b9-4264-a4a9-2145736fba1c	5090743a-d027-4520-b054-9c499bf9dcf7
ef821766-67b9-4264-a4a9-2145736fba1c	da69f708-4a12-4903-a1d4-48c43e701101
ef821766-67b9-4264-a4a9-2145736fba1c	9d5095b3-a1d0-4d80-a903-0fecb41be697
ef821766-67b9-4264-a4a9-2145736fba1c	def629a6-ed88-4ac3-be9f-fc2780913616
ef821766-67b9-4264-a4a9-2145736fba1c	9c935e77-9a49-45dc-92ee-1e35b08cd516
ef821766-67b9-4264-a4a9-2145736fba1c	2ef56599-2061-457f-a8c9-d22cfa2bac2f
ef821766-67b9-4264-a4a9-2145736fba1c	8ac98381-85a3-40bc-b35b-c07153d60b99
ef821766-67b9-4264-a4a9-2145736fba1c	ed30218c-9096-4bf1-92e1-4221639dd6f3
ef821766-67b9-4264-a4a9-2145736fba1c	9b748560-936f-4591-9cff-c5090a48e70d
ef821766-67b9-4264-a4a9-2145736fba1c	492432ef-431a-40ec-af1d-9b3c3d449134
33a06996-ee92-42ff-84b2-0797e0ec0c16	d378d6ca-b970-4137-9ef3-c27af2674550
33a06996-ee92-42ff-84b2-0797e0ec0c16	0a602b54-102c-43d9-a654-3d235d30bbc0
33a06996-ee92-42ff-84b2-0797e0ec0c16	5b5fe0c3-3585-460f-8a9c-e483c37ff1a5
33a06996-ee92-42ff-84b2-0797e0ec0c16	5090743a-d027-4520-b054-9c499bf9dcf7
33a06996-ee92-42ff-84b2-0797e0ec0c16	37ea921c-f8d1-45cf-b150-4d4aaea15c67
33a06996-ee92-42ff-84b2-0797e0ec0c16	def629a6-ed88-4ac3-be9f-fc2780913616
33a06996-ee92-42ff-84b2-0797e0ec0c16	1ff0b248-31a9-4bdc-8abb-955fd6c32859
33a06996-ee92-42ff-84b2-0797e0ec0c16	07290bee-af67-4cfc-b626-b59a54bf2045
33a06996-ee92-42ff-84b2-0797e0ec0c16	9c935e77-9a49-45dc-92ee-1e35b08cd516
33a06996-ee92-42ff-84b2-0797e0ec0c16	2ef56599-2061-457f-a8c9-d22cfa2bac2f
33a06996-ee92-42ff-84b2-0797e0ec0c16	cbc5740d-6275-4df7-b6c4-ffe4990003c1
33a06996-ee92-42ff-84b2-0797e0ec0c16	ad21388b-1201-4f74-9881-803b519079b7
33a06996-ee92-42ff-84b2-0797e0ec0c16	9b748560-936f-4591-9cff-c5090a48e70d
33a06996-ee92-42ff-84b2-0797e0ec0c16	492432ef-431a-40ec-af1d-9b3c3d449134
5824f121-4754-4c06-b218-5dcb8ddc1188	0bbfa25f-b7a7-4f35-b2d0-96263815381d
5824f121-4754-4c06-b218-5dcb8ddc1188	7fe38196-6c16-4951-86a7-e753668cfc7b
5824f121-4754-4c06-b218-5dcb8ddc1188	e0113301-1b38-4f2a-9db2-3bdcbdecbb70
5824f121-4754-4c06-b218-5dcb8ddc1188	a0b00228-4237-42ad-820e-079ec8acb0f6
5824f121-4754-4c06-b218-5dcb8ddc1188	2ef56599-2061-457f-a8c9-d22cfa2bac2f
4bc4b462-e140-4943-b153-ea965f6a98cc	a0b00228-4237-42ad-820e-079ec8acb0f6
4bc4b462-e140-4943-b153-ea965f6a98cc	0a602b54-102c-43d9-a654-3d235d30bbc0
4bc4b462-e140-4943-b153-ea965f6a98cc	5090743a-d027-4520-b054-9c499bf9dcf7
4bc4b462-e140-4943-b153-ea965f6a98cc	def629a6-ed88-4ac3-be9f-fc2780913616
4bc4b462-e140-4943-b153-ea965f6a98cc	9c935e77-9a49-45dc-92ee-1e35b08cd516
4bc4b462-e140-4943-b153-ea965f6a98cc	2ef56599-2061-457f-a8c9-d22cfa2bac2f
4bc4b462-e140-4943-b153-ea965f6a98cc	8ac98381-85a3-40bc-b35b-c07153d60b99
4bc4b462-e140-4943-b153-ea965f6a98cc	ed30218c-9096-4bf1-92e1-4221639dd6f3
4bc4b462-e140-4943-b153-ea965f6a98cc	492432ef-431a-40ec-af1d-9b3c3d449134
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, is_system, created_at, updated_at) FROM stdin;
24de7e5d-abde-4f4d-a079-82829a261e1e	Admin	Toàn bộ quyền	t	2026-07-09 02:51:36.259718+00	2026-07-09 02:51:36.259718+00
ef821766-67b9-4264-a4a9-2145736fba1c	Manager	Approve phiếu, xem báo cáo toàn bộ	t	2026-07-09 02:51:36.259718+00	2026-07-09 02:51:36.259718+00
33a06996-ee92-42ff-84b2-0797e0ec0c16	Warehouse	Tạo phiếu nhập/xuất/chuyển kho, kiểm kê	t	2026-07-09 02:51:36.259718+00	2026-07-09 02:51:36.259718+00
5824f121-4754-4c06-b218-5dcb8ddc1188	Sale	Tạo báo giá, xem tồn kho	t	2026-07-09 02:51:36.259718+00	2026-07-09 02:51:36.259718+00
4bc4b462-e140-4943-b153-ea965f6a98cc	Accounting	Xem toàn bộ, xuất báo cáo	t	2026-07-09 02:51:36.259718+00	2026-07-09 02:51:36.259718+00
\.


--
-- Data for Name: serial_numbers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.serial_numbers (id, serial_no, variant_id, warehouse_id, status, receipt_line_id, delivery_line_id, mac_address, manufacturer_warranty_end, note, created_at, updated_at, customer_warranty_end) FROM stdin;
60d8fbaa-bd4f-4e45-8f25-6fdbbcde9904	1	7ece4eee-813f-4181-bada-2c9802a8de4b	ffb2ceb9-845f-4a55-a84e-8ea95391d9e2	active	35f81495-48d7-4290-b1e8-b27216070559	\N	\N	2026-07-09 06:41:44.613053+00	\N	2026-07-09 06:41:44.613053+00	2026-07-09 06:41:44.613053+00	\N
789f5d6b-c616-4ddc-8917-6c6cb17edfb8	2	7ece4eee-813f-4181-bada-2c9802a8de4b	ffb2ceb9-845f-4a55-a84e-8ea95391d9e2	active	35f81495-48d7-4290-b1e8-b27216070559	\N	\N	2026-07-09 06:41:44.613053+00	\N	2026-07-09 06:41:44.613053+00	2026-07-09 06:41:44.613053+00	\N
1d8a5eb2-fc25-4295-a2f8-0768bfb6c9cb	3	7ece4eee-813f-4181-bada-2c9802a8de4b	e1583f4b-2b34-42b4-8068-89de98f06277	active	005bcc36-7be3-47a2-8697-a416e9b8da3d	\N	\N	2028-07-08 17:00:00+00	\N	2026-07-09 06:56:22.841442+00	2026-07-09 06:56:22.841442+00	\N
204598f9-bd9a-4401-becd-cf4dc002d8ff	423424	7ece4eee-813f-4181-bada-2c9802a8de4b	e1583f4b-2b34-42b4-8068-89de98f06277	active	1b44c820-1e13-4530-87a2-3e0bb3a0ccfb	\N	432424324	\N	\N	2026-07-09 07:09:31.302253+00	2026-07-09 07:09:31.302253+00	\N
cbaf018e-137b-47e1-855b-1f83d41b2ffa	hfghgfhfghf	7ece4eee-813f-4181-bada-2c9802a8de4b	\N	sold	71777770-ac6c-44d7-8491-02e04a47ec0b	7aae0768-ff43-4f1d-b565-3ae9d05ef602	fghgfhfghfghgfh	\N	\N	2026-07-09 10:40:14.90288+00	2026-07-10 06:49:55.945597+00	\N
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_movements (id, variant_id, warehouse_id, serial_id, movement_type, quantity, unit_cost, ref_document_type, ref_document_id, created_by, created_at) FROM stdin;
64c62f5e-7dc5-4588-af1e-0a2b7e29b1b8	7ece4eee-813f-4181-bada-2c9802a8de4b	ffb2ceb9-845f-4a55-a84e-8ea95391d9e2	60d8fbaa-bd4f-4e45-8f25-6fdbbcde9904	in	1	12000000.00	receipt	88592c93-69d3-426e-8545-b5275c959f00	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 06:41:44.613053+00
f6db9eaa-97b9-401a-9c8e-ec040de42db6	7ece4eee-813f-4181-bada-2c9802a8de4b	ffb2ceb9-845f-4a55-a84e-8ea95391d9e2	789f5d6b-c616-4ddc-8917-6c6cb17edfb8	in	1	12000000.00	receipt	88592c93-69d3-426e-8545-b5275c959f00	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 06:41:44.613053+00
2a3b8a1a-c483-4d55-896a-263e7a206dad	7ece4eee-813f-4181-bada-2c9802a8de4b	e1583f4b-2b34-42b4-8068-89de98f06277	1d8a5eb2-fc25-4295-a2f8-0768bfb6c9cb	in	1	0.00	receipt	331d3639-977a-44b1-98f9-770a87ed4ded	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 06:56:22.841442+00
e8c600a4-133b-4b36-8384-03bf3528aa1c	7ece4eee-813f-4181-bada-2c9802a8de4b	e1583f4b-2b34-42b4-8068-89de98f06277	204598f9-bd9a-4401-becd-cf4dc002d8ff	in	1	0.00	receipt	af60e66d-7dd8-4633-9be0-4923c9b2d25b	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 07:09:31.302253+00
a0652e57-49ca-4c21-b667-03a7579a07d9	732b44fc-6143-4719-962c-7f991e8f7277	e1583f4b-2b34-42b4-8068-89de98f06277	\N	in	1	100000.00	receipt	0908e6a0-abb8-4583-9c23-7b1b891e9cef	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 08:07:50.786569+00
59c0eeb4-5dbf-431b-bc0c-6b3daf40a991	732b44fc-6143-4719-962c-7f991e8f7277	e1583f4b-2b34-42b4-8068-89de98f06277	\N	in	99	100000.00	receipt	58c374d3-37cd-46b2-b747-21d06b725057	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 08:10:18.013675+00
20dd98c0-1136-4de2-86d0-1a7a0b1b7230	732b44fc-6143-4719-962c-7f991e8f7277	70e4111c-5338-4898-9ac3-ca4d01cccabd	\N	in	10	120000.00	receipt	95bc95f2-3f33-4940-bce6-23546a0c2993	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 08:12:24.275958+00
8d4ebe1e-1de0-4661-8773-fbf15162e887	d047e5e2-1725-4a46-ac05-18263fabce06	e1583f4b-2b34-42b4-8068-89de98f06277	\N	in	1	1000000.00	receipt	e7363948-c81b-41dc-b545-f315e7183d24	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 10:26:40.518186+00
1dc7dd05-ff3f-43e4-8494-2236de46185d	7ece4eee-813f-4181-bada-2c9802a8de4b	70e4111c-5338-4898-9ac3-ca4d01cccabd	cbaf018e-137b-47e1-855b-1f83d41b2ffa	in	1	100000.00	receipt	dfe2eeb6-8953-4e09-9294-043926318b0c	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-09 10:40:14.90288+00
445784f7-62aa-474e-9349-fcdb2d69b205	7ece4eee-813f-4181-bada-2c9802a8de4b	70e4111c-5338-4898-9ac3-ca4d01cccabd	cbaf018e-137b-47e1-855b-1f83d41b2ffa	out	1	100000.00	delivery_order	08f26a2d-0532-42f5-9f1a-aeba3f192b68	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 06:49:55.945597+00
f691e092-9439-454a-9e5f-bcf53bc4c676	732b44fc-6143-4719-962c-7f991e8f7277	e1583f4b-2b34-42b4-8068-89de98f06277	\N	out	10	100000.00	delivery_order	aa5c99a7-08bf-46fe-8c1c-8bdd0d62379d	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 09:33:06.506397+00
\.


--
-- Data for Name: stocktake_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktake_lines (id, stocktake_id, variant_id, qty_system, qty_actual) FROM stdin;
\.


--
-- Data for Name: stocktake_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktake_results (id, stocktake_id, total_sku, matched, shortage, surplus, created_at, note) FROM stdin;
\.


--
-- Data for Name: stocktake_serials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktake_serials (id, stocktake_id, serial_id, status) FROM stdin;
\.


--
-- Data for Name: stocktakes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktakes (id, code, warehouse_id, scope_type, scope_ids, status, started_at, completed_at, created_by, note) FROM stdin;
\.


--
-- Data for Name: template_field_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_field_mappings (id, template_id, template_variable, source_type, database_field, bitrix_field, is_required) FROM stdin;
\.


--
-- Data for Name: transfer_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transfer_order_lines (id, transfer_order_id, variant_id, quantity, line_order, note, from_warehouse_id) FROM stdin;
d8bed14f-b4fa-41dd-836b-7fb6cc6ac9ac	281ab702-6040-4a3c-bbd9-9f40c38a8952	7ece4eee-813f-4181-bada-2c9802a8de4b	1	1	\N	\N
\.


--
-- Data for Name: transfer_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transfer_orders (id, code, transfer_type, from_warehouse_id, to_warehouse_id, status, approved_by, approved_at, completed_at, note, created_by, created_at, updated_at) FROM stdin;
281ab702-6040-4a3c-bbd9-9f40c38a8952	CK-2026-0001	demo_in	e85dc07c-37fe-4479-96fb-ccb65e3cace6	70e4111c-5338-4898-9ac3-ca4d01cccabd	draft	\N	\N	\N	\N	48cd6c35-942f-4362-99f9-59e4ca90a3ff	2026-07-10 06:50:38.638527+00	2026-07-10 06:50:38.638527+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, phone, password_hash, role_id, is_active, created_at, updated_at) FROM stdin;
48cd6c35-942f-4362-99f9-59e4ca90a3ff	Administrator	admin@wms.local	\N	$2b$10$VePdY/4Znahs4k/SWRmYoeTyXG0Gv/YzuvO6HunRrBTwvArvRWZMW	24de7e5d-abde-4f4d-a079-82829a261e1e	t	2026-07-09 02:55:34.65385+00	2026-07-09 02:55:34.65385+00
\.


--
-- Data for Name: variant_attribute_def_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_attribute_def_products (attribute_def_id, product_id) FROM stdin;
\.


--
-- Data for Name: variant_attribute_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_attribute_defs (id, name, unit, options, applies_to, is_active, created_at, field_type) FROM stdin;
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
6184e969-1836-48af-b861-254ac18d5f96	7ece4eee-813f-4181-bada-2c9802a8de4b	55a905ad-a29e-4e9e-a4a8-9b891b78ce81	\N	\N	\N	f
\.


--
-- Data for Name: variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variants (id, product_id, sku, name, unit, cost_price, sale_price, currency, weight_kg, warranty_months, reorder_point, is_active, created_at, updated_at) FROM stdin;
7ece4eee-813f-4181-bada-2c9802a8de4b	b5af88aa-0cf7-46d4-b73d-a19646597e43	SW-HW-16 Port	Switch Huawei 16 Port	Cái	0.00	0.00	VND	0.000	0	0	t	2026-07-09 06:40:07.62573+00	2026-07-09 06:49:54.304127+00
732b44fc-6143-4719-962c-7f991e8f7277	5ce50601-3912-4fea-be1d-ea7c79c6af48	Dây mạng CAT5 100m	Dây mạng CAT5 100m	Mét	\N	\N	VND	\N	\N	0	t	2026-07-09 08:04:52.898829+00	2026-07-09 08:04:52.898829+00
caa60f5d-eb8d-4155-84be-2e18ae9b1ef4	5ce50601-3912-4fea-be1d-ea7c79c6af48	Dây mạng CAT5 200m	Dây mạng CAT5 200m	Mét	\N	\N	VND	\N	\N	0	t	2026-07-09 08:21:06.860475+00	2026-07-09 08:21:06.860475+00
d047e5e2-1725-4a46-ac05-18263fabce06	96771024-eea6-4d09-9712-035477fbd8de	LCS-MS-365-STD	License Microsoft 365 Standard	License	\N	\N	VND	\N	\N	0	t	2026-07-09 09:22:59.502691+00	2026-07-09 09:22:59.502691+00
ddffeb07-5197-4b93-86c4-a31e68e85412	94af4731-cf97-4e6c-8091-d9bdf8594205	Dịch vụ lắp đặt dưới nước	Dịch vụ lắp đặt dưới nước	Lần	\N	0.00	VND	\N	\N	0	t	2026-07-10 03:52:00.623352+00	2026-07-10 03:52:00.623352+00
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, code, name, type, address, description, manager_id, is_active, created_at, updated_at, is_default) FROM stdin;
70e4111c-5338-4898-9ac3-ca4d01cccabd	WH-BH	Kho Bảo Hành	virtual	\N	Thiết bị đang gửi bảo hành NCC	\N	t	2026-07-09 02:51:36.259718+00	2026-07-09 02:51:36.259718+00	f
ffb2ceb9-845f-4a55-a84e-8ea95391d9e2	WH-SN	Kho Chờ Nhập SN	virtual	\N	Thiết bị chờ nhập serial number	\N	t	2026-07-09 02:51:36.259718+00	2026-07-09 02:51:36.259718+00	f
e85dc07c-37fe-4479-96fb-ccb65e3cace6	WH-DEMO	Kho Demo	virtual	\N	Thiết bị đang cho khách mượn demo	\N	f	2026-07-09 02:51:36.259718+00	2026-07-09 09:23:14.50752+00	f
d5c5dcc0-2471-4cb2-82a6-7ce2cef8bab4	WH-QC	Kho Chờ QC	virtual	\N	Thiết bị mới nhập đang kiểm tra chất lượng	\N	f	2026-07-09 02:51:36.259718+00	2026-07-09 09:23:30.361292+00	f
e1583f4b-2b34-42b4-8068-89de98f06277	WH-LLQ	Kho chính	physical			48cd6c35-942f-4362-99f9-59e4ca90a3ff	t	2026-07-09 06:52:47.279363+00	2026-07-10 10:29:15.549192+00	t
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 21, true);


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
-- Name: transfer_order_lines transfer_order_lines_from_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_from_warehouse_id_fkey FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id);


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
-- PostgreSQL database dump complete
--

\unrestrict bBEgbQmbYKG23NuLh40dNg9c4dXmXvchsyqKqX0Qkn8ySHgYnqphvzUibikGMmD

