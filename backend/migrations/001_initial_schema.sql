-- =============================================================
-- Warehouse Management System — Initial Schema
-- DNS Technology Invest Co., Ltd
-- Migration: 001_initial_schema.sql
-- Target: PostgreSQL 14+
-- =============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- USERS & RBAC
-- =============================================================

CREATE TABLE roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    description TEXT,
    is_system   BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL UNIQUE,
    description TEXT,
    "group"     TEXT
);

CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT        NOT NULL,
    role_id       UUID        NOT NULL REFERENCES roles(id),
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- =============================================================
-- COMPANIES & CONTACTS
-- =============================================================

CREATE TABLE companies (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT        NOT NULL UNIQUE,
    name              TEXT        NOT NULL,
    tax_code          TEXT,
    country           CHAR(2)     NOT NULL DEFAULT 'VN',
    address           TEXT,
    phone             TEXT,
    email             TEXT,
    bank_account      TEXT,
    bank_name         TEXT,
    bitrix_company_id TEXT,
    is_active         BOOLEAN     NOT NULL DEFAULT true,
    note              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE company_types (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK (type IN ('customer', 'supplier')),
    UNIQUE (company_id, type)
);

CREATE TABLE contacts (
    id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name         TEXT    NOT NULL,
    position          TEXT,
    phone             TEXT,
    email             TEXT,
    is_primary        BOOLEAN NOT NULL DEFAULT false,
    bitrix_contact_id TEXT,
    note              TEXT
);

-- =============================================================
-- WAREHOUSES
-- =============================================================

CREATE TABLE warehouses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT        NOT NULL UNIQUE,
    name        TEXT        NOT NULL,
    type        TEXT        NOT NULL CHECK (type IN ('physical', 'virtual')),
    address     TEXT,
    description TEXT,
    manager_id  UUID        REFERENCES users(id),
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- PRODUCT CATALOG
-- =============================================================

CREATE TABLE categories (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT    NOT NULL,
    -- Dùng để gợi ý mã sản phẩm: product.code = category.short_code + brand.short_code
    -- (product.schema.ts không ép NOT NULL ở DB — chỉ bắt buộc lúc tạo qua API/form,
    -- để không phá fixture test cũ đang insert trực tiếp DB bỏ qua field này).
    short_code TEXT    UNIQUE,
    parent_id  UUID    REFERENCES categories(id),
    is_active  BOOLEAN NOT NULL DEFAULT true
);

-- Hãng sản xuất — tách bảng riêng (trước đây products.brand là text tự do, không quản lý
-- được nhất quán). short_code dùng chung với categories.short_code để gợi ý product.code.
CREATE TABLE brands (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT    NOT NULL,
    short_code TEXT    UNIQUE,
    is_active  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE products (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT        NOT NULL UNIQUE,
    name         TEXT        NOT NULL,
    name_en      TEXT,
    brand_id     UUID        REFERENCES brands(id),
    model_number TEXT,
    category_id  UUID        REFERENCES categories(id),
    product_type TEXT        NOT NULL CHECK (product_type IN ('storable', 'consumable', 'service', 'bundle')),
    description  TEXT,
    image_url    TEXT,
    is_active    BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE variants (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID           NOT NULL REFERENCES products(id),
    sku             TEXT           NOT NULL UNIQUE,
    name            TEXT           NOT NULL,
    unit            TEXT           NOT NULL DEFAULT 'Cái',
    cost_price      NUMERIC(15,2),
    sale_price      NUMERIC(15,2),
    currency        CHAR(3)        NOT NULL DEFAULT 'VND',
    weight_kg       NUMERIC(8,3),
    warranty_months INTEGER,
    reorder_point   INTEGER        NOT NULL DEFAULT 0,
    is_active       BOOLEAN        NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE bundle_items (
    id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_variant_id UUID    NOT NULL REFERENCES variants(id),
    item_variant_id   UUID    NOT NULL REFERENCES variants(id),
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (bundle_variant_id, item_variant_id),
    CHECK (bundle_variant_id <> item_variant_id)
);

CREATE TABLE variant_suppliers (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id     UUID          NOT NULL REFERENCES variants(id),
    company_id     UUID          NOT NULL REFERENCES companies(id),
    supplier_sku   TEXT,
    supplier_price NUMERIC(15,2),
    lead_time_days INTEGER,
    is_preferred   BOOLEAN       NOT NULL DEFAULT false
);

-- =============================================================
-- PURCHASE ORDERS
-- =============================================================
-- Chứng từ CAM KẾT mua hàng, KHÔNG động inventory trực tiếp — giống vai trò của
-- quotations với delivery_orders. Receipt (import_type='purchase') tham chiếu ngược
-- lại po_id/po_line_id để biết đã nhận bao nhiêu trên tổng đã đặt (remaining_qty
-- tính động, không lưu cột riêng — xem purchaseorder.repository.ts::findLineProgress).

CREATE TABLE purchase_orders (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code           TEXT        NOT NULL,
    company_id     UUID        NOT NULL REFERENCES companies(id),
    contact_id     UUID        REFERENCES contacts(id),
    bitrix_deal_id TEXT,
    status         TEXT        NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'confirmed', 'cancelled')),
    note           TEXT,
    created_by     UUID        NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_company_id ON purchase_orders(company_id);
CREATE INDEX idx_po_status     ON purchase_orders(status);

-- Mỗi dòng = 1 SKU + số lượng + giá/bảo hành THOẢ THUẬN cho lần mua này. unit_price/
-- warranty_months copy từ variants.cost_price/warranty_months lúc tạo (giá trị gợi ý
-- mặc định) nhưng lưu độc lập — sửa variants sau đó KHÔNG ảnh hưởng dòng PO đã tạo.
CREATE TABLE purchase_order_lines (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    variant_id        UUID          NOT NULL REFERENCES variants(id),
    quantity          INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price        NUMERIC(15,2) NOT NULL,
    warranty_months   INTEGER,
    line_order        INTEGER       NOT NULL DEFAULT 0,
    note              TEXT
);

CREATE INDEX idx_po_lines_purchase_order_id ON purchase_order_lines(purchase_order_id);

-- =============================================================
-- QUOTATIONS
-- =============================================================

CREATE TABLE quotations (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT          NOT NULL,
    company_id        UUID          NOT NULL REFERENCES companies(id),
    contact_id        UUID          REFERENCES contacts(id),
    project_name      TEXT,
    delivery_location TEXT,
    -- 1 kho cho cả quotation (giống delivery_orders.warehouse_id) — dùng để tạo
    -- reserved_items lúc Confirm. Nullable ở Draft, bắt buộc trước khi Confirm.
    warehouse_id      UUID          REFERENCES warehouses(id),
    valid_days        INTEGER,
    expired_at        DATE,
    bitrix_deal_id    TEXT,
    bitrix_deal_url   TEXT,
    bitrix_synced_at  TIMESTAMPTZ,
    status            TEXT          NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'confirmed', 'expired', 'cancelled')),
    subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_total         NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    grand_total       NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_in_words   TEXT,
    terms             TEXT,
    created_by        UUID          NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotations_company_id ON quotations(company_id);
CREATE INDEX idx_quotations_status     ON quotations(status);

CREATE TABLE quotation_sections (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id  UUID          NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    name          TEXT          NOT NULL,
    section_order INTEGER       NOT NULL DEFAULT 0,
    subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE TABLE quotation_line_items (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID          NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    section_id   UUID          NOT NULL REFERENCES quotation_sections(id) ON DELETE CASCADE,
    variant_id   UUID          REFERENCES variants(id),
    bundle_id    UUID          REFERENCES variants(id),
    description  TEXT,
    unit         TEXT,
    quantity     NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price   NUMERIC(15,2) NOT NULL DEFAULT 0,
    warranty     TEXT,
    line_total   NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    vat_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_reserved  BOOLEAN       NOT NULL DEFAULT true,
    line_order   INTEGER       NOT NULL DEFAULT 0,
    note         TEXT
);

CREATE INDEX idx_qli_quotation_id ON quotation_line_items(quotation_id);

-- =============================================================
-- RECEIPTS
-- =============================================================

CREATE TABLE receipts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT        NOT NULL,
    import_type       TEXT        NOT NULL,
    company_id        UUID        REFERENCES companies(id),
    contact_id        UUID        REFERENCES contacts(id),
    warehouse_id      UUID        NOT NULL REFERENCES warehouses(id),
    -- PO gốc (tuỳ chọn — không phải mọi receipt purchase đều xuất phát từ 1 PO chính
    -- thức). PO phải ở status='confirmed' mới được tham chiếu (receipt.service.ts validate).
    po_id             UUID        REFERENCES purchase_orders(id),
    ref_document_type TEXT,
    ref_document_id   UUID,
    status            TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending_approval', 'approved', 'completed', 'cancelled')),
    approved_by       UUID        REFERENCES users(id),
    approved_at       TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    note              TEXT,
    created_by        UUID        NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receipt_lines (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id    UUID          NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    variant_id    UUID          NOT NULL REFERENCES variants(id),
    -- Dòng PO gốc đang được nhận 1 phần/toàn bộ qua receipt_line này (tuỳ chọn) — dùng
    -- để tính received_qty/pending_qty/remaining_qty của purchase_order_lines.
    po_line_id    UUID          REFERENCES purchase_order_lines(id),
    quantity      INTEGER       NOT NULL CHECK (quantity > 0),
    -- "Lô nhập" — set = quantity lúc Receipt Complete (trước đó NULL, vì hàng chưa thật sự
    -- vào kho). Delivery xuất theo FIFO trừ dần field này (mặc định, CLAUDE.md mục 19) —
    -- 1 receipt_line đã LÀ 1 lô (1 SKU trong 1 lần nhập), không cần thêm bảng stock_batches
    -- riêng (trùng receipt_id/variant_id/cost_price, chỉ thêm đúng 1 field qty_remaining).
    -- Định danh lô dùng luôn receipts.code + receipts.completed_at + company_id, không cần
    -- thêm "batch_name" riêng.
    qty_remaining   INTEGER,
    cost_price      NUMERIC(15,2) NOT NULL,
    -- Bảo hành THỰC TẾ của lô này — copy từ po_line.warranty_months lúc tạo Receipt
    -- (giống cost_price), có thể sửa độc lập nếu hàng về khác thoả thuận PO. Dùng tính
    -- serial_numbers.warranty_end lúc Complete (= completed_at + warranty_months).
    warranty_months INTEGER,
    line_order      INTEGER       NOT NULL DEFAULT 0,
    note            TEXT,
    CHECK (qty_remaining IS NULL OR (qty_remaining >= 0 AND qty_remaining <= quantity))
);

CREATE INDEX idx_receipt_lines_receipt_id  ON receipt_lines(receipt_id);
CREATE INDEX idx_receipt_lines_po_line_id  ON receipt_lines(po_line_id);

-- =============================================================
-- DELIVERY ORDERS
-- =============================================================

CREATE TABLE delivery_orders (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT        NOT NULL,
    export_type  TEXT        NOT NULL,
    company_id   UUID        REFERENCES companies(id),
    contact_id   UUID        REFERENCES contacts(id),
    warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    quotation_id UUID        REFERENCES quotations(id),
    -- polymorphic relation giống receipts (mục 19) — dùng cho export_type='adjustment',
    -- tham chiếu tới stocktake_results (mục 8/9: "Document gốc" của điều chỉnh tồn kho).
    ref_document_type TEXT,
    ref_document_id   UUID,
    status       TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'pending_approval', 'approved', 'completed', 'cancelled')),
    approved_by  UUID        REFERENCES users(id),
    approved_at  TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reason       TEXT,
    note         TEXT,
    created_by   UUID        NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_orders_quotation_id ON delivery_orders(quotation_id);
CREATE INDEX idx_delivery_orders_status       ON delivery_orders(status);

CREATE TABLE delivery_order_lines (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id      UUID    NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    variant_id              UUID    NOT NULL REFERENCES variants(id),
    quantity                INTEGER NOT NULL CHECK (quantity > 0),
    bundle_id               UUID    REFERENCES variants(id),
    -- Set khi export_type='sale' và dòng này xuất để trừ vào 1 dòng báo giá cụ thể —
    -- dùng để tính exported_qty/pending_qty/remaining_qty của quotation_line_items
    -- (CLAUDE.md mục 6, 16) và để Complete() biết dòng nào cần giải phóng reserved.
    quotation_line_item_id UUID    REFERENCES quotation_line_items(id),
    line_order              INTEGER NOT NULL DEFAULT 0,
    note                    TEXT
);

CREATE INDEX idx_do_lines_delivery_order_id ON delivery_order_lines(delivery_order_id);

-- =============================================================
-- TRANSFER ORDERS
-- =============================================================

CREATE TABLE transfer_orders (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT        NOT NULL,
    transfer_type     TEXT        NOT NULL
                        CHECK (transfer_type IN ('transfer', 'warranty_in', 'demo_in', 'qc_pass', 'sn_ready')),
    from_warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    to_warehouse_id   UUID        NOT NULL REFERENCES warehouses(id),
    status            TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending_approval', 'approved', 'completed', 'cancelled')),
    approved_by       UUID        REFERENCES users(id),
    approved_at       TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    note              TEXT,
    created_by        UUID        NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (from_warehouse_id <> to_warehouse_id)
);

CREATE TABLE transfer_order_lines (
    id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_order_id UUID    NOT NULL REFERENCES transfer_orders(id) ON DELETE CASCADE,
    variant_id        UUID    NOT NULL REFERENCES variants(id),
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    line_order        INTEGER NOT NULL DEFAULT 0,
    note              TEXT
);

-- =============================================================
-- SERIAL NUMBERS
-- =============================================================
-- Không có bảng stock_batches riêng — 1 receipt_line ĐÃ LÀ 1 lô nhập (1 SKU trong 1 lần
-- nhập), xem ghi chú ở receipt_lines.qty_remaining phía trên.

CREATE TABLE serial_numbers (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no        TEXT        NOT NULL UNIQUE,
    variant_id       UUID        NOT NULL REFERENCES variants(id),
    warehouse_id     UUID        REFERENCES warehouses(id),
    status           TEXT        NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'sold', 'disposed')),
    receipt_line_id  UUID        REFERENCES receipt_lines(id),
    delivery_line_id UUID        REFERENCES delivery_order_lines(id),
    mac_address      TEXT,
    warranty_end     DATE,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sn_variant_id    ON serial_numbers(variant_id);
CREATE INDEX idx_sn_warehouse_id  ON serial_numbers(warehouse_id);
CREATE INDEX idx_sn_status        ON serial_numbers(status);

-- =============================================================
-- INVENTORY
-- =============================================================

CREATE TABLE inventory (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id   UUID          NOT NULL REFERENCES variants(id),
    warehouse_id UUID          NOT NULL REFERENCES warehouses(id),
    qty_on_hand  INTEGER       NOT NULL DEFAULT 0,
    qty_reserved INTEGER       NOT NULL DEFAULT 0,
    avg_cost     NUMERIC(15,2),
    last_updated TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (variant_id, warehouse_id),
    CONSTRAINT chk_qty_on_hand  CHECK (qty_on_hand >= 0),
    CONSTRAINT chk_qty_reserved CHECK (qty_reserved >= 0)
);

-- =============================================================
-- RESERVED ITEMS
-- =============================================================

CREATE TABLE reserved_items (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id             UUID        NOT NULL REFERENCES variants(id),
    warehouse_id           UUID        NOT NULL REFERENCES warehouses(id),
    quantity               INTEGER     NOT NULL CHECK (quantity > 0),
    source_type            TEXT        NOT NULL CHECK (source_type IN ('quotation', 'delivery_order')),
    source_id              UUID        NOT NULL,
    quotation_line_item_id UUID        REFERENCES quotation_line_items(id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reserved_source    ON reserved_items(source_type, source_id);
CREATE INDEX idx_reserved_variant_wh ON reserved_items(variant_id, warehouse_id);

-- =============================================================
-- STOCK MOVEMENTS
-- =============================================================

CREATE TABLE stock_movements (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id        UUID          NOT NULL REFERENCES variants(id),
    warehouse_id      UUID          NOT NULL REFERENCES warehouses(id),
    serial_id         UUID          REFERENCES serial_numbers(id),
    movement_type     TEXT          NOT NULL CHECK (movement_type IN ('in', 'out')),
    quantity          INTEGER       NOT NULL CHECK (quantity > 0),
    unit_cost         NUMERIC(15,2),
    ref_document_type TEXT,
    ref_document_id   UUID,
    created_by        UUID          NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_ref      ON stock_movements(ref_document_type, ref_document_id);
CREATE INDEX idx_movements_variant  ON stock_movements(variant_id, warehouse_id);
CREATE INDEX idx_movements_created  ON stock_movements(created_at);

-- =============================================================
-- STOCKTAKE
-- =============================================================

CREATE TABLE stocktakes (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT        NOT NULL,
    warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    scope_type   TEXT        NOT NULL DEFAULT 'all'
                   CHECK (scope_type IN ('all', 'by_sku', 'by_category')),
    scope_ids    JSONB,
    status       TEXT        NOT NULL DEFAULT 'in_progress'
                   CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_by   UUID        NOT NULL REFERENCES users(id),
    note         TEXT
);

CREATE TABLE stocktake_lines (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    stocktake_id UUID    NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
    variant_id   UUID    NOT NULL REFERENCES variants(id),
    qty_system   INTEGER NOT NULL DEFAULT 0,
    qty_actual   INTEGER,
    difference   INTEGER GENERATED ALWAYS AS (
                     CASE WHEN qty_actual IS NOT NULL
                     THEN qty_actual - qty_system
                     ELSE NULL END
                 ) STORED
);

CREATE TABLE stocktake_serials (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stocktake_id UUID NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
    serial_id    UUID NOT NULL REFERENCES serial_numbers(id),
    status       TEXT NOT NULL CHECK (status IN ('found', 'missing', 'unexpected')),
    UNIQUE (stocktake_id, serial_id)
);

CREATE TABLE stocktake_results (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stocktake_id UUID        NOT NULL UNIQUE REFERENCES stocktakes(id),
    total_sku    INTEGER     NOT NULL DEFAULT 0,
    matched      INTEGER     NOT NULL DEFAULT 0,
    shortage     INTEGER     NOT NULL DEFAULT 0,
    surplus      INTEGER     NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    note         TEXT
);

-- =============================================================
-- TEMPLATE MODULE
-- =============================================================

CREATE TABLE document_templates (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    object_type TEXT        NOT NULL CHECK (object_type IN ('quotation', 'receipt', 'delivery_order')),
    file_path   TEXT        NOT NULL,
    is_default  BOOLEAN     NOT NULL DEFAULT false,
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_by  UUID        NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE template_field_mappings (
    id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id       UUID    NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    template_variable TEXT    NOT NULL,
    source_type       TEXT    NOT NULL CHECK (source_type IN ('database', 'bitrix')),
    database_field    TEXT,
    bitrix_field      TEXT,
    is_required       BOOLEAN NOT NULL DEFAULT false
);

-- =============================================================
-- BITRIX INTEGRATION
-- =============================================================

-- Mapping field Quotation <- field Bitrix Deal/Company/Contact (CLAUDE.md mục 13).
-- Admin tự cấu hình trong Settings, không cần dev — KHÁC với template_field_mappings
-- (bảng đó là mapping cho XUẤT file Carbone; bảng này là mapping cho NHẬP dữ liệu từ
-- Bitrix vào form Quotation lúc fetch/sync deal).
CREATE TABLE bitrix_field_mappings (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_field TEXT    NOT NULL UNIQUE,
    bitrix_object   TEXT    NOT NULL CHECK (bitrix_object IN ('deal', 'company', 'contact')),
    bitrix_field    TEXT    NOT NULL
);

-- =============================================================
-- CUSTOM FIELDS & EAV
-- =============================================================

CREATE TABLE custom_fields (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name  TEXT    NOT NULL,
    field_label TEXT    NOT NULL,
    field_type  TEXT    NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')),
    object_type TEXT    NOT NULL CHECK (object_type IN ('quotation', 'receipt', 'delivery_order', 'product', 'company')),
    -- Danh sách lựa chọn khi field_type='select', VD ["Loại A","Loại B"] — NULL cho các
    -- field_type khác. Không có cột này thì field_type='select' không có nơi lưu options.
    options     JSONB,
    is_system   BOOLEAN NOT NULL DEFAULT false,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    UNIQUE (object_type, field_name)
);

CREATE TABLE field_values (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    object_type TEXT        NOT NULL,
    object_id   UUID        NOT NULL,
    field_id    UUID        NOT NULL REFERENCES custom_fields(id),
    value       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_field_values_object ON field_values(object_type, object_id);

-- =============================================================
-- IMPORT/EXPORT TYPE SETTINGS
-- =============================================================

CREATE TABLE import_types (
    id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    key                   TEXT    NOT NULL UNIQUE,
    label                 TEXT    NOT NULL,
    parent_key            TEXT,
    is_system             BOOLEAN NOT NULL DEFAULT false,
    requires_company      TEXT    NOT NULL DEFAULT 'none'
                            CHECK (requires_company IN ('supplier', 'customer', 'none')),
    requires_ref_document TEXT    NOT NULL DEFAULT 'none'
                            CHECK (requires_ref_document IN ('quotation', 'stocktake_result', 'none')),
    is_active             BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE export_types (
    id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    key                TEXT    NOT NULL UNIQUE,
    label              TEXT    NOT NULL,
    parent_key         TEXT,
    is_system          BOOLEAN NOT NULL DEFAULT false,
    requires_company   TEXT    NOT NULL DEFAULT 'none'
                         CHECK (requires_company IN ('supplier', 'customer', 'none')),
    requires_quotation BOOLEAN NOT NULL DEFAULT false,
    is_active          BOOLEAN NOT NULL DEFAULT true
);

-- =============================================================
-- SEED: Permissions
-- =============================================================

INSERT INTO permissions (key, description, "group") VALUES
    ('quotation.create',   'Tạo báo giá',                  'quotation'),
    ('quotation.edit',     'Sửa báo giá',                  'quotation'),
    ('quotation.confirm',  'Xác nhận báo giá',             'quotation'),
    ('quotation.view',     'Xem báo giá',                  'quotation'),
    ('receipt.create',     'Tạo phiếu nhập kho',           'receipt'),
    ('receipt.approve',    'Duyệt phiếu nhập kho',         'receipt'),
    ('receipt.complete',   'Hoàn thành phiếu nhập kho',    'receipt'),
    ('receipt.view',       'Xem phiếu nhập kho',           'receipt'),
    ('delivery.create',    'Tạo phiếu xuất kho',           'delivery'),
    ('delivery.approve',   'Duyệt phiếu xuất kho',         'delivery'),
    ('delivery.complete',  'Hoàn thành phiếu xuất kho',    'delivery'),
    ('delivery.view',      'Xem phiếu xuất kho',           'delivery'),
    ('transfer.create',    'Tạo phiếu chuyển kho',         'transfer'),
    ('transfer.approve',   'Duyệt phiếu chuyển kho',       'transfer'),
    ('transfer.complete',  'Hoàn thành phiếu chuyển kho',  'transfer'),
    ('transfer.view',      'Xem phiếu chuyển kho',         'transfer'),
    ('stocktake.create',   'Tạo kiểm kê',                  'stocktake'),
    ('stocktake.complete', 'Hoàn thành kiểm kê',           'stocktake'),
    ('stocktake.view',     'Xem kiểm kê',                  'stocktake'),
    ('report.inventory',   'Xem báo cáo tồn kho',          'report'),
    ('report.revenue',     'Xem báo cáo doanh thu',        'report'),
    ('report.view',        'Xem báo cáo tổng hợp',         'report'),
    ('settings.roles',     'Quản lý role',                 'settings'),
    ('settings.users',     'Quản lý users',                'settings'),
    ('settings.warehouse', 'Quản lý kho',                  'settings'),
    ('settings.products',  'Quản lý sản phẩm',             'settings'),
    ('purchase_order.create',  'Tạo đơn mua hàng (PO)',      'purchase_order'),
    ('purchase_order.edit',    'Sửa đơn mua hàng (PO)',      'purchase_order'),
    ('purchase_order.confirm', 'Xác nhận đơn mua hàng (PO)', 'purchase_order'),
    ('purchase_order.view',    'Xem đơn mua hàng (PO)',      'purchase_order');

-- =============================================================
-- SEED: Roles mặc định (is_system = true)
-- =============================================================

INSERT INTO roles (name, description, is_system) VALUES
    ('Admin',       'Toàn bộ quyền',                                          true),
    ('Manager',     'Approve phiếu, xem báo cáo toàn bộ',                    true),
    ('Warehouse',   'Tạo phiếu nhập/xuất/chuyển kho, kiểm kê',               true),
    ('Sale',        'Tạo báo giá, xem tồn kho',                              true),
    ('Accounting',  'Xem toàn bộ, xuất báo cáo',                             true);

-- Admin: tất cả permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin';

-- Manager: approve + view tất cả + báo cáo
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Manager'
  AND p.key IN (
    'quotation.view', 'quotation.confirm',
    'receipt.approve', 'receipt.complete', 'receipt.view',
    'delivery.approve', 'delivery.complete', 'delivery.view',
    'transfer.approve', 'transfer.complete', 'transfer.view',
    'stocktake.view',
    'purchase_order.confirm', 'purchase_order.view',
    'report.inventory', 'report.revenue', 'report.view'
  );

-- Warehouse: tạo + complete phiếu kho + kiểm kê
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Warehouse'
  AND p.key IN (
    'receipt.create', 'receipt.view',
    'delivery.create', 'delivery.view',
    'transfer.create', 'transfer.view',
    'stocktake.create', 'stocktake.complete', 'stocktake.view',
    'purchase_order.create', 'purchase_order.edit', 'purchase_order.confirm', 'purchase_order.view',
    'report.inventory'
  );

-- Sale: báo giá + xem tồn kho
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Sale'
  AND p.key IN (
    'quotation.create', 'quotation.edit', 'quotation.confirm', 'quotation.view',
    'report.inventory'
  );

-- Accounting: xem tất cả + xuất báo cáo
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Accounting'
  AND p.key IN (
    'quotation.view',
    'receipt.view',
    'delivery.view',
    'transfer.view',
    'stocktake.view',
    'purchase_order.view',
    'report.inventory', 'report.revenue', 'report.view'
  );

-- =============================================================
-- SEED: Kho ảo mặc định
-- =============================================================

INSERT INTO warehouses (code, name, type, description) VALUES
    ('WH-DEMO', 'Kho Demo',         'virtual', 'Thiết bị đang cho khách mượn demo'),
    ('WH-BH',   'Kho Bảo Hành',    'virtual', 'Thiết bị đang gửi bảo hành NCC'),
    ('WH-QC',   'Kho Chờ QC',      'virtual', 'Thiết bị mới nhập đang kiểm tra chất lượng'),
    ('WH-SN',   'Kho Chờ Nhập SN', 'virtual', 'Thiết bị chờ nhập serial number');

-- =============================================================
-- SEED: Import/Export Types (system)
-- =============================================================

INSERT INTO import_types (key, label, is_system, requires_company, requires_ref_document) VALUES
    ('purchase',   'Mua hàng từ NCC',        true, 'supplier', 'none'),
    ('return_in',  'Khách hàng trả lại',      true, 'customer', 'quotation'),
    ('adjustment', 'Điều chỉnh tồn kho thừa', true, 'none',     'stocktake_result');

INSERT INTO export_types (key, label, is_system, requires_company, requires_quotation) VALUES
    ('sale',         'Bán hàng',               true, 'customer', true),
    ('internal',     'Xuất nội bộ',            true, 'none',     false),
    ('demo_out',     'Cho mượn demo',          true, 'customer', false),
    ('warranty_out', 'Gửi bảo hành',           true, 'none',     false),
    ('return_out',   'Trả hàng về NCC',        true, 'supplier', false),
    ('dispose',      'Huỷ hàng hỏng',          true, 'none',     false),
    ('adjustment',   'Điều chỉnh tồn kho thiếu', true, 'none',  false);

COMMIT;
