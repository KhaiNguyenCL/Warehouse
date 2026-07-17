# Verify Skill — WMS Backend API

## Stack
- Backend: Fastify on `http://localhost:3000`
- API prefix: `/api/v1/`
- Auth: POST `/api/v1/auth/login` → `{ token }` (Bearer)
- Dev credentials: `admin@wms.local` / `admin123`

## Start backend (if not running)
```bash
cd apps/backend && pnpm dev
# or from root:
pnpm --filter backend dev
```

## Get token (one-liner)
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wms.local","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")
```

## Key endpoints to drive flows
- Warehouses: GET `/api/v1/warehouses`
- Products: GET `/api/v1/products?limit=10`
- Inventory: GET `/api/v1/inventory?variant_id=X&warehouse_id=Y`
- Serials: GET `/api/v1/inventory/serials?receipt_line_id=X`

## Receipt workflow (draft → completed)
1. POST `/api/v1/receipts` with `warehouse_id`, `import_type`, `lines[]`
2. PATCH `/api/v1/receipts/:id` to update cost/warranty on lines
3. PATCH `/api/v1/receipts/:id/complete` with `{ lines: [{ line_id, serials: [{serial_no}] }] }`
4. Verify: GET `/api/v1/inventory` shows `qty_on_hand` increased
5. Verify: GET `/api/v1/inventory/serials?receipt_line_id=X` shows correct `manufacturer_warranty_end` and `customer_warranty_end`

## Delivery Order workflow (draft → completed)
1. POST `/api/v1/deliveries` with `warehouse_id`, `export_type`, `lines[]`
   - `internal` type: no company/quotation needed
   - `sale` type: requires `company_id` + `quotation_id` (Confirmed quotation)
2. PATCH `/api/v1/deliveries/:id/complete` with `{ lines: [{ line_id, serials: ["SN-xxx"] }] }`
   - serials must be active + correct variant + correct warehouse
3. Verify: inventory `qty_on_hand` decreased; serials status=`sold`, warehouse_id=null
4. Verify: `receipt_lines.qty_remaining` decremented (FIFO for consumable, serial-mapped for storable)
5. Verify: stock_movements has 1 row per serial (storable) or 1 row total (consumable)

## Transfer Order workflow (draft → completed)
1. POST `/api/v1/transfers` with `transfer_type`, `to_warehouse_id`, `lines[]`
   - `transfer`: cần `from_warehouse_id` (kho vật lý)
   - `warranty_in`/`demo_in`/`qc_pass`/`sn_ready`: service tự suy `from_warehouse_id` từ kho ảo tương ứng
2. PATCH `/api/v1/transfers/:id/complete` với `{ lines: [{ line_id, serials }] }`
3. Verify: `qty_on_hand` kho nguồn giảm, kho đích tăng; serial `warehouse_id` đổi sang kho đích
4. Verify: `stock_movements` có cặp out/in per serial

## Known test data (wms_db)
- Kho chính: `e1583f4b-2b34-42b4-8068-89de98f06277`
- Storable variant (Test Switch): `8da0bf66-aa44-48fb-a741-c1045bbebaf1`
- Consumable variant (Dây mạng CAT5): `732b44fc-6143-4719-962c-7f991e8f7277`
