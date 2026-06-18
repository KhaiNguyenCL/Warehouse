// ─── RBAC ────────────────────────────────────────────────────────────────────

export interface Role {
  id: string
  name: string
  description?: string
  is_system: boolean
}

export interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  role_id: string
  is_active: boolean
  created_at: string
}

// ─── COMPANY ─────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  code: string
  name: string
  tax_code?: string
  country: string
  address?: string
  phone?: string
  email?: string
  is_active: boolean
}

// ─── WAREHOUSE ───────────────────────────────────────────────────────────────

export type WarehouseType = 'physical' | 'virtual'

export interface Warehouse {
  id: string
  code: string
  name: string
  type: WarehouseType
  address?: string
  description?: string
  is_active: boolean
}

// ─── PRODUCT ─────────────────────────────────────────────────────────────────

export type ProductType = 'storable' | 'consumable' | 'service' | 'bundle'

export interface Product {
  id: string
  code: string
  name: string
  name_en?: string
  brand?: string
  product_type: ProductType
  category_id?: string
  is_active: boolean
}

export interface Variant {
  id: string
  product_id: string
  sku: string
  name: string
  specifications?: Record<string, unknown>
  unit: string
  cost_price?: number
  sale_price?: number
  currency: string
  warranty_months?: number
  reorder_point: number
  is_active: boolean
}

// ─── INVENTORY ───────────────────────────────────────────────────────────────

export type SerialStatus = 'active' | 'sold' | 'disposed'

export interface SerialNumber {
  id: string
  serial_no: string
  variant_id: string
  warehouse_id?: string
  batch_id?: string
  status: SerialStatus
  mac_address?: string
  warranty_end?: string
}

export interface Inventory {
  id: string
  variant_id: string
  warehouse_id: string
  qty_on_hand: number
  qty_reserved: number
  qty_available: number  // computed: qty_on_hand - qty_reserved
  avg_cost?: number
}

// ─── RECEIPT ─────────────────────────────────────────────────────────────────

export type ImportType = 'purchase' | 'return_in' | 'adjustment'
export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled'

export interface Receipt {
  id: string
  code: string
  import_type: ImportType
  company_id?: string
  warehouse_id: string
  status: DocumentStatus
  approved_by?: string
  approved_at?: string
  completed_at?: string
  note?: string
  created_by: string
  created_at: string
}

export interface ReceiptLine {
  id: string
  receipt_id: string
  variant_id: string
  quantity: number
  cost_price: number
  line_order: number
}

// ─── DELIVERY ORDER ───────────────────────────────────────────────────────────

export type ExportType = 'sale' | 'internal' | 'demo_out' | 'warranty_out' | 'return_out' | 'dispose' | 'adjustment'

export interface DeliveryOrder {
  id: string
  code: string
  export_type: ExportType
  company_id?: string
  warehouse_id: string
  quotation_id?: string
  status: DocumentStatus
  approved_by?: string
  approved_at?: string
  completed_at?: string
  created_by: string
  created_at: string
}

// ─── QUOTATION ───────────────────────────────────────────────────────────────

export type QuotationStatus = 'draft' | 'confirmed' | 'expired' | 'cancelled'

export interface Quotation {
  id: string
  code: string
  company_id: string
  project_name?: string
  status: QuotationStatus
  subtotal: number
  vat_total: number
  discount: number
  grand_total: number
  expired_at?: string
  bitrix_deal_id?: string
  created_by: string
  created_at: string
}

export interface QuotationLineItem {
  id: string
  quotation_id: string
  section_id: string
  variant_id?: string
  bundle_id?: string
  description?: string
  unit?: string
  quantity: number
  unit_price: number
  line_total: number
  vat_percent: number
  vat_amount: number
  is_reserved: boolean
}
