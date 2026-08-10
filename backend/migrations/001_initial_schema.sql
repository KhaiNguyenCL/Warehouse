--
-- PostgreSQL database dump
--

\restrict zi3RpyhgS2IBFQe2oo37nbgZ0GfiSOau73AayyNhfO13PtgZHtVUd5bqe0P0bHu

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
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bitrix_field_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitrix_field_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_field text NOT NULL,
    bitrix_object text NOT NULL,
    bitrix_field text NOT NULL,
    CONSTRAINT bitrix_field_mappings_bitrix_object_check CHECK ((bitrix_object = ANY (ARRAY['deal'::text, 'company'::text, 'contact'::text])))
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_code text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bundle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bundle_variant_id uuid NOT NULL,
    item_variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    CONSTRAINT bundle_items_check CHECK ((bundle_variant_id <> item_variant_id)),
    CONSTRAINT bundle_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_code text,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sync_locked boolean DEFAULT false NOT NULL
);


--
-- Name: company_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    type text NOT NULL,
    CONSTRAINT company_types_type_check CHECK ((type = ANY (ARRAY['customer'::text, 'supplier'::text])))
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: custom_fields; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: customer_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    price numeric(15,2) NOT NULL,
    currency character(3) DEFAULT 'VND'::bpchar NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: delivery_order_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: document_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_sequences (
    doc_type character varying(20) NOT NULL,
    year integer NOT NULL,
    last_seq integer DEFAULT 0 NOT NULL
);


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: export_types; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: field_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    object_type text NOT NULL,
    object_id uuid NOT NULL,
    field_id uuid NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: import_types; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    description text,
    "group" text
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: purchase_order_lines; Type: TABLE; Schema: public; Owner: -
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
    vat_percent numeric(5,2) DEFAULT 0 NOT NULL,
    CONSTRAINT purchase_order_lines_quantity_check CHECK ((quantity > 0))
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
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
    confirmed_by uuid,
    deal_title text,
    deal_amount numeric(15,2),
    contract_number text,
    region text,
    bitrix_deal_url text,
    delivery_location text,
    start_date date,
    end_date date,
    deleted_at timestamp with time zone,
    CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'cancelled'::text])))
);


--
-- Name: quotation_line_items; Type: TABLE; Schema: public; Owner: -
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
    note text,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    sub_section_id uuid
);


--
-- Name: quotation_section_name_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_section_name_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quotation_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_id uuid NOT NULL,
    name text NOT NULL,
    section_order integer DEFAULT 0 NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL
);


--
-- Name: quotation_sub_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_sub_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_id uuid NOT NULL,
    section_id uuid NOT NULL,
    product_id uuid,
    name character varying(255) NOT NULL,
    sub_section_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quotation_term_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_term_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: -
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
    quote_number text,
    quote_date date,
    note text,
    CONSTRAINT quotations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: receipt_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
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
    received_date date,
    CONSTRAINT receipts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: reserved_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: serial_numbers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stocktake_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stocktake_results; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stocktake_serials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stocktake_serials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stocktake_id uuid NOT NULL,
    serial_id uuid NOT NULL,
    status text NOT NULL,
    CONSTRAINT stocktake_serials_status_check CHECK ((status = ANY (ARRAY['found'::text, 'missing'::text, 'unexpected'::text])))
);


--
-- Name: stocktakes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: template_field_mappings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: transfer_order_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: transfer_orders; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: variant_attribute_def_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variant_attribute_def_products (
    attribute_def_id uuid NOT NULL,
    product_id uuid NOT NULL
);


--
-- Name: variant_attribute_defs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: variant_attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variant_attribute_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    attribute_def_id uuid NOT NULL,
    value character varying(255),
    include_in_sku boolean DEFAULT false NOT NULL
);


--
-- Name: variant_sku_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.variant_sku_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: variant_suppliers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: variants; Type: TABLE; Schema: public; Owner: -
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    model text,
    item_code text,
    part_number text,
    image_url text,
    vat_percent numeric(5,2) DEFAULT 10 NOT NULL
);


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: bitrix_field_mappings bitrix_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitrix_field_mappings
    ADD CONSTRAINT bitrix_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: bitrix_field_mappings bitrix_field_mappings_quotation_field_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitrix_field_mappings
    ADD CONSTRAINT bitrix_field_mappings_quotation_field_key UNIQUE (quotation_field);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_short_code_key UNIQUE (short_code);


--
-- Name: bundle_items bundle_items_bundle_variant_id_item_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_variant_id_item_variant_id_key UNIQUE (bundle_variant_id, item_variant_id);


--
-- Name: bundle_items bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_short_code_key UNIQUE (short_code);


--
-- Name: companies companies_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_code_key UNIQUE (code);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_types company_types_company_id_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_company_id_type_key UNIQUE (company_id, type);


--
-- Name: company_types company_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: custom_fields custom_fields_object_type_field_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_object_type_field_name_key UNIQUE (object_type, field_name);


--
-- Name: custom_fields custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_pkey PRIMARY KEY (id);


--
-- Name: customer_prices customer_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_prices
    ADD CONSTRAINT customer_prices_pkey PRIMARY KEY (id);


--
-- Name: customer_prices customer_prices_variant_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_prices
    ADD CONSTRAINT customer_prices_variant_id_company_id_key UNIQUE (variant_id, company_id);


--
-- Name: delivery_order_lines delivery_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_pkey PRIMARY KEY (id);


--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);


--
-- Name: document_sequences document_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_sequences
    ADD CONSTRAINT document_sequences_pkey PRIMARY KEY (doc_type, year);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: export_types export_types_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_types
    ADD CONSTRAINT export_types_key_key UNIQUE (key);


--
-- Name: export_types export_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_types
    ADD CONSTRAINT export_types_pkey PRIMARY KEY (id);


--
-- Name: field_values field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT field_values_pkey PRIMARY KEY (id);


--
-- Name: import_types import_types_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_types
    ADD CONSTRAINT import_types_key_key UNIQUE (key);


--
-- Name: import_types import_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_types
    ADD CONSTRAINT import_types_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_variant_id_warehouse_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_variant_id_warehouse_id_key UNIQUE (variant_id, warehouse_id);


--
-- Name: permissions permissions_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_key_key UNIQUE (key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_lines purchase_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quotation_line_items quotation_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_pkey PRIMARY KEY (id);


--
-- Name: quotation_section_name_presets quotation_section_name_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_section_name_presets
    ADD CONSTRAINT quotation_section_name_presets_pkey PRIMARY KEY (id);


--
-- Name: quotation_sections quotation_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_sections
    ADD CONSTRAINT quotation_sections_pkey PRIMARY KEY (id);


--
-- Name: quotation_sub_sections quotation_sub_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_sub_sections
    ADD CONSTRAINT quotation_sub_sections_pkey PRIMARY KEY (id);


--
-- Name: quotation_term_templates quotation_term_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_term_templates
    ADD CONSTRAINT quotation_term_templates_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: receipt_lines receipt_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: reserved_items reserved_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: serial_numbers serial_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_pkey PRIMARY KEY (id);


--
-- Name: serial_numbers serial_numbers_serial_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_serial_no_key UNIQUE (serial_no);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stocktake_lines stocktake_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_lines
    ADD CONSTRAINT stocktake_lines_pkey PRIMARY KEY (id);


--
-- Name: stocktake_results stocktake_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_results
    ADD CONSTRAINT stocktake_results_pkey PRIMARY KEY (id);


--
-- Name: stocktake_results stocktake_results_stocktake_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_results
    ADD CONSTRAINT stocktake_results_stocktake_id_key UNIQUE (stocktake_id);


--
-- Name: stocktake_serials stocktake_serials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_pkey PRIMARY KEY (id);


--
-- Name: stocktake_serials stocktake_serials_stocktake_id_serial_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_stocktake_id_serial_id_key UNIQUE (stocktake_id, serial_id);


--
-- Name: stocktakes stocktakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktakes
    ADD CONSTRAINT stocktakes_pkey PRIMARY KEY (id);


--
-- Name: template_field_mappings template_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_field_mappings
    ADD CONSTRAINT template_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: transfer_order_lines transfer_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_pkey PRIMARY KEY (id);


--
-- Name: transfer_orders transfer_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_def_products variant_attribute_def_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_def_products
    ADD CONSTRAINT variant_attribute_def_products_pkey PRIMARY KEY (attribute_def_id, product_id);


--
-- Name: variant_attribute_defs variant_attribute_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_defs
    ADD CONSTRAINT variant_attribute_defs_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_values variant_attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_values variant_attribute_values_variant_id_attribute_def_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_attribute_def_id_unique UNIQUE (variant_id, attribute_def_id);


--
-- Name: variant_suppliers variant_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_suppliers
    ADD CONSTRAINT variant_suppliers_pkey PRIMARY KEY (id);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: variants variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_sku_key UNIQUE (sku);


--
-- Name: warehouses warehouses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_code_key UNIQUE (code);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_delivery_orders_quotation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_orders_quotation_id ON public.delivery_orders USING btree (quotation_id);


--
-- Name: idx_delivery_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_orders_status ON public.delivery_orders USING btree (status);


--
-- Name: idx_do_lines_delivery_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_do_lines_delivery_order_id ON public.delivery_order_lines USING btree (delivery_order_id);


--
-- Name: idx_field_values_object; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_values_object ON public.field_values USING btree (object_type, object_id);


--
-- Name: idx_movements_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movements_created ON public.stock_movements USING btree (created_at);


--
-- Name: idx_movements_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movements_ref ON public.stock_movements USING btree (ref_document_type, ref_document_id);


--
-- Name: idx_movements_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movements_variant ON public.stock_movements USING btree (variant_id, warehouse_id);


--
-- Name: idx_po_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_company_id ON public.purchase_orders USING btree (company_id);


--
-- Name: idx_po_lines_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_lines_purchase_order_id ON public.purchase_order_lines USING btree (purchase_order_id);


--
-- Name: idx_po_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_qli_quotation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qli_quotation_id ON public.quotation_line_items USING btree (quotation_id);


--
-- Name: idx_quotations_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_company_id ON public.quotations USING btree (company_id);


--
-- Name: idx_quotations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_status ON public.quotations USING btree (status);


--
-- Name: idx_receipt_lines_po_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipt_lines_po_line_id ON public.receipt_lines USING btree (po_line_id);


--
-- Name: idx_receipt_lines_receipt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipt_lines_receipt_id ON public.receipt_lines USING btree (receipt_id);


--
-- Name: idx_reserved_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserved_source ON public.reserved_items USING btree (source_type, source_id);


--
-- Name: idx_reserved_variant_wh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserved_variant_wh ON public.reserved_items USING btree (variant_id, warehouse_id);


--
-- Name: idx_sn_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sn_status ON public.serial_numbers USING btree (status);


--
-- Name: idx_sn_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sn_variant_id ON public.serial_numbers USING btree (variant_id);


--
-- Name: idx_sn_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sn_warehouse_id ON public.serial_numbers USING btree (warehouse_id);


--
-- Name: brands brands_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bundle_items bundle_items_bundle_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_variant_id_fkey FOREIGN KEY (bundle_variant_id) REFERENCES public.variants(id);


--
-- Name: bundle_items bundle_items_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.variants(id);


--
-- Name: categories categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: company_types company_types_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_types
    ADD CONSTRAINT company_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: customer_prices customer_prices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_prices
    ADD CONSTRAINT customer_prices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: customer_prices customer_prices_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_prices
    ADD CONSTRAINT customer_prices_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;


--
-- Name: delivery_order_lines delivery_order_lines_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.variants(id);


--
-- Name: delivery_order_lines delivery_order_lines_delivery_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES public.delivery_orders(id) ON DELETE CASCADE;


--
-- Name: delivery_order_lines delivery_order_lines_quotation_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_quotation_line_item_id_fkey FOREIGN KEY (quotation_line_item_id) REFERENCES public.quotation_line_items(id);


--
-- Name: delivery_order_lines delivery_order_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_lines
    ADD CONSTRAINT delivery_order_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: delivery_orders delivery_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: delivery_orders delivery_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: delivery_orders delivery_orders_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: delivery_orders delivery_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: delivery_orders delivery_orders_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);


--
-- Name: delivery_orders delivery_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: document_templates document_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: field_values field_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT field_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.custom_fields(id);


--
-- Name: inventory inventory_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: inventory inventory_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: purchase_order_lines purchase_order_lines_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_lines
    ADD CONSTRAINT purchase_order_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: purchase_orders purchase_orders_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotation_line_items quotation_line_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.variants(id);


--
-- Name: quotation_line_items quotation_line_items_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: quotation_line_items quotation_line_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.quotation_sections(id) ON DELETE CASCADE;


--
-- Name: quotation_line_items quotation_line_items_sub_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_sub_section_id_fkey FOREIGN KEY (sub_section_id) REFERENCES public.quotation_sub_sections(id) ON DELETE SET NULL;


--
-- Name: quotation_line_items quotation_line_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_line_items
    ADD CONSTRAINT quotation_line_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: quotation_sections quotation_sections_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_sections
    ADD CONSTRAINT quotation_sections_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: quotation_sub_sections quotation_sub_sections_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_sub_sections
    ADD CONSTRAINT quotation_sub_sections_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: quotation_sub_sections quotation_sub_sections_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_sub_sections
    ADD CONSTRAINT quotation_sub_sections_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: quotation_sub_sections quotation_sub_sections_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_sub_sections
    ADD CONSTRAINT quotation_sub_sections_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.quotation_sections(id) ON DELETE CASCADE;


--
-- Name: quotations quotations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: quotations quotations_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: quotations quotations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotations quotations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: receipt_lines receipt_lines_po_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_po_line_id_fkey FOREIGN KEY (po_line_id) REFERENCES public.purchase_order_lines(id);


--
-- Name: receipt_lines receipt_lines_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE;


--
-- Name: receipt_lines receipt_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: receipts receipts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: receipts receipts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: receipts receipts_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: receipts receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: receipts receipts_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: receipts receipts_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: reserved_items reserved_items_quotation_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_quotation_line_item_id_fkey FOREIGN KEY (quotation_line_item_id) REFERENCES public.quotation_line_items(id);


--
-- Name: reserved_items reserved_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: reserved_items reserved_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserved_items
    ADD CONSTRAINT reserved_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: serial_numbers serial_numbers_delivery_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_delivery_line_id_fkey FOREIGN KEY (delivery_line_id) REFERENCES public.delivery_order_lines(id);


--
-- Name: serial_numbers serial_numbers_receipt_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_receipt_line_id_fkey FOREIGN KEY (receipt_line_id) REFERENCES public.receipt_lines(id);


--
-- Name: serial_numbers serial_numbers_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: serial_numbers serial_numbers_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_serial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_serial_id_fkey FOREIGN KEY (serial_id) REFERENCES public.serial_numbers(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: stock_movements stock_movements_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stocktake_lines stocktake_lines_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_lines
    ADD CONSTRAINT stocktake_lines_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktakes(id) ON DELETE CASCADE;


--
-- Name: stocktake_lines stocktake_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_lines
    ADD CONSTRAINT stocktake_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: stocktake_results stocktake_results_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_results
    ADD CONSTRAINT stocktake_results_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktakes(id);


--
-- Name: stocktake_serials stocktake_serials_serial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_serial_id_fkey FOREIGN KEY (serial_id) REFERENCES public.serial_numbers(id);


--
-- Name: stocktake_serials stocktake_serials_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_serials
    ADD CONSTRAINT stocktake_serials_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktakes(id) ON DELETE CASCADE;


--
-- Name: stocktakes stocktakes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktakes
    ADD CONSTRAINT stocktakes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stocktakes stocktakes_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktakes
    ADD CONSTRAINT stocktakes_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: template_field_mappings template_field_mappings_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_field_mappings
    ADD CONSTRAINT template_field_mappings_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.document_templates(id) ON DELETE CASCADE;


--
-- Name: transfer_order_lines transfer_order_lines_from_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_from_warehouse_id_fkey FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: transfer_order_lines transfer_order_lines_transfer_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_transfer_order_id_fkey FOREIGN KEY (transfer_order_id) REFERENCES public.transfer_orders(id) ON DELETE CASCADE;


--
-- Name: transfer_order_lines transfer_order_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_order_lines
    ADD CONSTRAINT transfer_order_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: transfer_orders transfer_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: transfer_orders transfer_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: transfer_orders transfer_orders_from_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_from_warehouse_id_fkey FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: transfer_orders transfer_orders_to_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfer_orders
    ADD CONSTRAINT transfer_orders_to_warehouse_id_fkey FOREIGN KEY (to_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: variant_attribute_def_products variant_attribute_def_products_attribute_def_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_def_products
    ADD CONSTRAINT variant_attribute_def_products_attribute_def_id_foreign FOREIGN KEY (attribute_def_id) REFERENCES public.variant_attribute_defs(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_def_products variant_attribute_def_products_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_def_products
    ADD CONSTRAINT variant_attribute_def_products_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_attribute_def_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_attribute_def_id_foreign FOREIGN KEY (attribute_def_id) REFERENCES public.variant_attribute_defs(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_variant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_foreign FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;


--
-- Name: variant_suppliers variant_suppliers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_suppliers
    ADD CONSTRAINT variant_suppliers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: variant_suppliers variant_suppliers_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_suppliers
    ADD CONSTRAINT variant_suppliers_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: variants variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: warehouses warehouses_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict zi3RpyhgS2IBFQe2oo37nbgZ0GfiSOau73AayyNhfO13PtgZHtVUd5bqe0P0bHu

