import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Form, Input, InputNumber, Select, Switch, Button, Popconfirm,
  Checkbox, DatePicker, Skeleton, Tooltip,
} from 'antd'
import dayjs from 'dayjs'
import { ArrowLeftOutlined, EditOutlined, InfoCircleOutlined, CheckOutlined, PrinterOutlined } from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import { renderToStaticMarkup } from 'react-dom/server'
import { api } from '../lib/api'
import { useVariantDetail } from '../hooks/useVariantDetail'
import { PageHeader } from '../components/ui/PageHeader'
import VariantSuppliersPanel from '../components/VariantSuppliersPanel'
import CustomerPricesPanel from '../components/CustomerPricesPanel'
import CustomerDescriptionsPanel from '../components/CustomerDescriptionsPanel'
import BundleItemsPanel from '../components/BundleItemsPanel'
import CustomFieldsPanel from '../components/CustomFieldsPanel'
import { moneyProps } from '../lib/utils'
import { fieldTier } from '@/styles/fieldWidths'
import { ImageUpload } from '../components/ImageUpload'
import { SectionCard, Field, GroupRow, Val, labelStyle } from '../components/VariantFormLayout'

const UNITS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Cuộn', 'Mét', 'Cổng', 'License', 'Gói', 'Dây', 'Lần', 'Giờ', 'Ngày']
const CURRENCIES = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CNY', label: 'CNY' },
  { value: 'JPY', label: 'JPY' },
]

export default function VariantDetailPage() {
  const { productId, variantId } = useParams<{ productId: string; variantId?: string }>()
  const navigate = useNavigate()
  // Route /products/:productId/variants/create khớp KHÔNG khai báo :variantId → luôn undefined
  // ở đây, đó là cách phân biệt "tạo mới" với "xem/sửa SKU đã tồn tại" — 1 component xử lý cả
  // 2 (giống pattern ReceiptFormPage/PurchaseOrderCreatePage: mode create/edit/view chung 1 trang),
  // thay vì tách VariantCreatePage riêng lặp lại toàn bộ layout + logic của trang này.
  const isCreate = !variantId
  const hook = useVariantDetail(productId!, variantId)
  const [isEditing, setIsEditing] = useState(false)
  // Khi tạo mới, mọi field luôn ở trạng thái sửa được — không có bước "bấm Sửa" riêng.
  const editable = isCreate || isEditing
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState<'info' | 'lots' | 'history'>('info')

  useEffect(() => {
    if (hook.attrDefs === undefined) return
    if (isCreate) { hook.buildAttrValues([]); return }
    if (hook.variant) hook.buildAttrValues(hook.variant.attribute_values ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.variant?.id, hook.attrDefs, isCreate])

  // Chế độ tạo mới — gợi ý sẵn Mã hàng/Tên theo sản phẩm cha + giá/đơn vị/BH mặc định lấy
  // từ SKU đầu tiên đã có (nếu có), giống hành vi VariantCreatePage cũ.
  useEffect(() => {
    if (!isCreate || !hook.product) return
    const ref = hook.product.variants?.[0]
    form.setFieldsValue({
      item_code:       hook.product.code ?? '',
      name:            hook.product.name ?? '',
      unit:            ref?.unit ?? 'Cái',
      currency:        ref?.currency ?? 'VND',
      cost_price:      ref?.cost_price ?? undefined,
      sale_price:      ref?.sale_price ?? undefined,
      manufacturer_warranty_months: ref?.manufacturer_warranty_months ?? undefined,
      weight_kg:       ref?.weight_kg ?? undefined,
      reorder_point:   ref?.reorder_point ?? undefined,
      is_active:       true,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.product?.id, isCreate])

  // Form luôn hiển thị input (kể cả ở chế độ xem, disabled) nên phải đồng bộ
  // giá trị mỗi khi variant thay đổi — không chỉ lúc bấm Sửa.
  function syncFormFromVariant() {
    if (!hook.variant) return
    form.setFieldsValue({
      item_code:       hook.variant.item_code,
      name:            hook.variant.name,
      model:           hook.variant.model,
      part_number:     hook.variant.part_number,
      description:      hook.variant.description ?? undefined,
      description_long: hook.variant.description_long ?? undefined,
      unit:            hook.variant.unit,
      cost_price:      hook.variant.cost_price ?? undefined,
      sale_price:      hook.variant.sale_price ?? undefined,
      currency:        hook.variant.currency ?? 'VND',
      weight_kg:       hook.variant.weight_kg ?? undefined,
      manufacturer_warranty_months: hook.variant.manufacturer_warranty_months ?? undefined,
      reorder_point:   hook.variant.reorder_point ?? undefined,
      is_active:       hook.variant.is_active ?? true,
      image_url:       hook.variant.image_url ?? undefined,
    })
  }

  useEffect(() => {
    if (isEditing) return   // background refetch không được reset form khi đang sửa
    syncFormFromVariant()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.variant, form])

  function cancelEdit() {
    if (isCreate) { navigate(`/products/${productId}`); return }
    hook.buildAttrValues(hook.variant?.attribute_values ?? [])
    syncFormFromVariant()
    setIsEditing(false)
  }

  async function saveEdit() {
    const values = await form.validateFields()
    if (isCreate) {
      hook.createVariant.mutate({ values, attrs: hook.attrValues })
      return
    }
    hook.updateVariant.mutate(
      { values, attrs: hook.attrValues },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  const { data: reorderSuggestion, isLoading: suggLoading } = useQuery({
    queryKey: ['reorder-suggestion', productId, variantId],
    queryFn: async () => (await api.get(`/products/${productId}/variants/${variantId}/reorder-suggestion`)).data,
    enabled: !!productId && !!variantId,
    staleTime: 5 * 60 * 1000,
  })

  // Tồn kho tổng (tất cả kho) của đúng SKU này — dùng cho ô "Tồn hiện tại" (Tồn & vị trí)
  // và câu cảnh báo ở cột phải, theo mockup "chi tiết SKU 1B".
  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['inventory', 'by-variant', variantId],
    queryFn: async () => (await api.get('/inventory/by-variant', { params: { variant_id: variantId, limit: 1 } })).data,
    enabled: !!variantId,
  })
  const inv = invData?.data?.[0] ?? null

  // 3 hoạt động gần nhất (nhập/xuất/chuyển) của SKU này — dữ liệu thật từ stock_movements,
  // dùng cho panel "Hoạt động gần đây" theo mockup "chi tiết SKU 1B".
  const { data: recentMovements, isLoading: movLoading } = useQuery({
    queryKey: ['inventory', 'recent-movements', variantId],
    queryFn: async () => (await api.get(`/inventory/variants/${variantId}/movements`)).data,
    enabled: !!variantId,
  })

  // Tab "Lô & hạn dùng" — endpoint /inventory/lots đã có sẵn (breakdown từng receipt_line),
  // chỉ fetch khi tab được mở tới.
  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['inventory', 'lots', variantId],
    queryFn: async () => (await api.get('/inventory/lots', { params: { variant_id: variantId } })).data,
    enabled: activeTab === 'lots' && !!variantId,
  })

  // In tem/mã vạch — không có lib barcode 1D trong repo (package.json không có jsbarcode),
  // nên cả 2 nút đều in QR code mã hàng (đã có sẵn qrcode.react, đủ để máy quét kho scan lại
  // đúng SKU) — chỉ khác tiêu đề trên tem, KHÔNG fabricate 1 barcode giả không quét được.
  function printLabel(kind: 'tem' | 'barcode') {
    const variant = hook.variant
    if (!variant) return
    const qrHtml = renderToStaticMarkup(<QRCodeSVG value={variant.sku} size={140} />)
    const win = window.open('', '_blank', 'width=320,height=380')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${variant.item_code}</title>
      <style>
        body{font-family:sans-serif;text-align:center;padding:16px}
        h2{margin:8px 0 0;font-size:14px}
        p{margin:2px 0;color:#555;font-size:12px}
      </style></head><body>
      ${qrHtml}
      <h2>${variant.item_code}</h2>
      <p>${variant.name}</p>
      <p>${kind === 'tem' ? 'Tem kệ' : 'Mã vạch (QR)'}</p>
      <script>window.onload = () => window.print()</script>
      </body></html>`)
    win.document.close()
  }

  if (hook.isLoading) return <Skeleton active style={{ padding: '20px' }} />
  if (!hook.product) return <div style={{ padding: 20 }}>Không tìm thấy sản phẩm</div>
  if (!isCreate && !hook.variant) return <div style={{ padding: 20 }}>Không tìm thấy SKU</div>

  const v = hook.variant
  const p = hook.product

  return (
    <div className="theme-2a -m-6 bg-background" style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/products/${productId}`)}
              style={{ padding: '0 4px' }}
            />
            <span style={{ color: 'var(--text-2)', fontSize: 'var(--t2-label)' }}>{p.name}</span>
            <span style={{ color: 'var(--text-3)', fontSize: 'var(--t2-label)' }}>/</span>
            <span style={{ fontSize: 'var(--t2-label)' }}>{isCreate ? 'Thêm SKU mới' : (v?.item_code || v?.sku)}</span>
          </span>
        }
        actions={
          isCreate ? (
            <>
              <Button onClick={cancelEdit}>Huỷ</Button>
              <Button type="primary" loading={hook.createVariant.isPending} onClick={saveEdit}>Tạo SKU</Button>
            </>
          ) : isEditing ? (
            <>
              <Button onClick={cancelEdit}>Huỷ</Button>
              <Button type="primary" loading={hook.updateVariant.isPending} onClick={saveEdit}>Lưu</Button>
            </>
          ) : (
            <>
              <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>Sửa</Button>
              <Popconfirm
                title={`Xóa SKU "${v?.item_code}"?`}
                description="Không thể xóa nếu còn tồn kho hoặc serial number."
                okText="Xóa" okButtonProps={{ danger: true }} cancelText="Hủy"
                onConfirm={() => hook.deleteVariant.mutate()}
              >
                <Button danger loading={hook.deleteVariant.isPending}>Xóa SKU</Button>
              </Popconfirm>
            </>
          )
        }
      />

      {/* Tab — theo mockup "chi tiết SKU 1B": chỉ "Thông tin" có nội dung đầy đủ (form 2 cột
          hiện có). "Lô & hạn dùng" dùng lại endpoint /inventory/lots đã có sẵn. "Lịch sử tồn"
          và "Kiểm kê" gộp chung 1 tab placeholder — cả 2 đều chưa có nguồn dữ liệu theo từng
          SKU, để riêng 2 tab rỗng cạnh nhau làm loãng tab bar không cần thiết. Ẩn hẳn khi tạo
          mới — "Lô & hạn dùng"/"Lịch sử & kiểm kê" cần variantId thật, chưa có tới lúc tạo xong. */}
      {!isCreate && (
      <div style={{ display: 'flex', gap: 16, fontSize: 'var(--t2-strong)', borderBottom: '1px solid var(--border)' }}>
        {([
          ['info', 'Thông tin'],
          ['lots', 'Lô & hạn dùng'],
          ['history', 'Lịch sử & kiểm kê'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px',
              fontSize: 'var(--t2-strong)', fontFamily: 'inherit',
              fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? 'var(--text-1)' : 'var(--text-2)',
              boxShadow: activeTab === key ? 'inset 0 -2px 0 var(--accent)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      {activeTab === 'lots' && (
        <SectionCard title="Lô & hạn dùng">
          {lotsLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : !lots?.length ? (
            <div style={{ fontSize: 'var(--t2-body)', color: 'var(--text-3)' }}>Chưa có lô nào (chưa nhập kho lần nào)</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--t2-body)' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-2)' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Phiếu nhập</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Ngày</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>SL nhập</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Còn lại</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Giá nhập</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>BH cty</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l: any) => (
                  <tr key={l.receipt_line_id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px' }}>{l.receipt_code}{l.po_code ? ` (${l.po_code})` : ''}</td>
                    <td style={{ padding: '6px 8px' }}>{l.completed_at ? new Date(l.completed_at).toLocaleDateString('vi-VN') : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{l.quantity}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{l.qty_remaining}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{l.cost_price != null ? Number(l.cost_price).toLocaleString('vi-VN') : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{l.customer_warranty_months ? `${l.customer_warranty_months} tháng` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      )}

      {activeTab === 'history' && (
        <SectionCard title="Lịch sử & kiểm kê">
          <div style={{ fontSize: 'var(--t2-body)', color: 'var(--text-3)' }}>
            Chưa có báo cáo lịch sử tồn kho hoặc kiểm kê riêng theo từng SKU.
          </div>
        </SectionCard>
      )}

      {/* ── 2 cột: trái = nội dung chính, phải = tóm tắt sticky (ảnh, đề xuất đặt hàng) ──
          Theo mockup "chi tiết SKU 1B": cột phải luôn nổi bật hành động/trạng thái quan
          trọng nhất, không lẫn vào giữa các field form dài ở cột trái. */}
      {activeTab === 'info' && (
      <>
      <Form form={form} layout="vertical" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionCard title="Thông tin SKU">
          <div>

            <GroupRow label="Nhận diện">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <Field label="Tên *">
                  <Form.Item name="name" noStyle rules={[{ required: true }]}>
                    <Input style={{ width: '100%' }} disabled={!editable} />
                  </Form.Item>
                </Field>
                <Field label="Mã hàng *">
                  <Form.Item name="item_code" noStyle rules={[{ required: true }]}>
                    <Input style={{ width: '100%' }} disabled={!editable} />
                  </Form.Item>
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {/* Field DUY NHẤT không sửa được nên không dùng Form.Item/Input — nhưng vẫn cho
                    khung giống hệt field disabled khác để không "nhẹ ký" hơn hàng xóm. */}
                <Field label="SKU (hệ thống)">
                  <div style={{
                    width: '100%', height: 30, display: 'flex', alignItems: 'center',
                    border: '1px solid var(--border, #b7c2d6)', borderRadius: 6, padding: '0 10px',
                    background: 'var(--bg-subtle)', fontFamily: 'monospace', fontSize: 'var(--t2-body)',
                  }}>
                    <Val v={v?.sku} />
                  </div>
                </Field>
                <Field label="Model (mã nhà SX)">
                  <Form.Item name="model" noStyle>
                    <Input style={{ width: '100%' }} placeholder="VD: SG110-16HP" disabled={!editable} />
                  </Form.Item>
                </Field>
                <Field label="Part Number">
                  <Form.Item name="part_number" noStyle>
                    <Input style={{ width: '100%' }} placeholder="VD: C9200L-48P-4X-E" disabled={!editable} />
                  </Form.Item>
                </Field>
              </div>
            </GroupRow>

            <GroupRow label="Phân loại & đơn vị">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Đơn vị tồn *">
                  <Form.Item name="unit" noStyle>
                    <Select options={UNITS.map((u) => ({ value: u, label: u }))} showSearch allowClear style={{ width: '100%', maxWidth: fieldTier.medium }} disabled={!editable} />
                  </Form.Item>
                </Field>
                <Field label="Tiền tệ">
                  <Form.Item name="currency" noStyle>
                    <Select options={CURRENCIES} style={{ width: '100%', maxWidth: fieldTier.short }} disabled={!editable} />
                  </Form.Item>
                </Field>
                <Field label="Trạng thái">
                  <Form.Item name="is_active" noStyle valuePropName="checked">
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" disabled={!editable} />
                  </Form.Item>
                </Field>
              </div>
            </GroupRow>

            <GroupRow label="Tồn & vị trí">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Tồn hiện tại (tất cả kho)">
                  <div style={{
                    width: '100%', height: 30, display: 'flex', alignItems: 'center',
                    border: '1px solid var(--border, #b7c2d6)', borderRadius: 6, padding: '0 10px',
                    background: 'var(--bg-subtle)', fontSize: 'var(--t2-body)',
                  }}>
                    {invLoading ? '…' : <Val v={inv ? `${inv.qty_on_hand}${v?.unit ? ` ${v?.unit}` : ''}` : undefined} />}
                  </div>
                </Field>
                <Field label="Điểm đặt lại (tối thiểu)">
                  <Form.Item name="reorder_point" noStyle>
                    <InputNumber controls={false} style={{ width: '100%' }} min={0} disabled={!editable} />
                  </Form.Item>
                </Field>
                <Field label="Cân nặng (kg)">
                  <Form.Item name="weight_kg" noStyle>
                    <InputNumber controls={false} style={{ width: '100%', maxWidth: fieldTier.short }} min={0} disabled={!editable} />
                  </Form.Item>
                </Field>
              </div>
              <div style={{ fontSize: 'var(--t2-label)', color: 'var(--text-3)' }}>
                Tồn hiện tại chỉ đổi được qua phiếu nhập / xuất, không sửa trực tiếp ở đây.
              </div>
            </GroupRow>

            <GroupRow label="Giá">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Giá nhập gợi ý (đ)">
                  <Form.Item name="cost_price" noStyle>
                    <InputNumber {...moneyProps} style={{ ...moneyProps.style, maxWidth: fieldTier.medium }} disabled={!editable} />
                  </Form.Item>
                </Field>
                <Field label="Giá bán gợi ý (đ)">
                  <Form.Item name="sale_price" noStyle>
                    <InputNumber {...moneyProps} style={{ ...moneyProps.style, maxWidth: fieldTier.medium }} disabled={!editable} />
                  </Form.Item>
                </Field>
                <Field label="BH hãng gợi ý">
                  <Form.Item name="manufacturer_warranty_months" noStyle>
                    <InputNumber controls={false} style={{ width: '100%', maxWidth: fieldTier.short }} min={0} addonAfter="tháng" disabled={!editable} />
                  </Form.Item>
                </Field>
              </div>
            </GroupRow>

            <GroupRow label="Mô tả">
              <Field label="Mô tả ngắn (mặc định trên báo giá)" full stacked>
                <Form.Item name="description" noStyle>
                  <Input style={{ width: '100%' }} placeholder="Mô tả ngắn — dùng khi chưa có mô tả riêng theo khách" disabled={!editable} />
                </Form.Item>
              </Field>
              <Field label="Mô tả dài (thông số kỹ thuật)" full stacked>
                <Form.Item name="description_long" noStyle>
                  <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} style={{ width: '100%' }} placeholder="Thông số kỹ thuật đầy đủ" disabled={!editable} />
                </Form.Item>
              </Field>
            </GroupRow>

          </div>
        {!isCreate && <CustomFieldsPanel objectType="variant" objectId={variantId!} inline />}
      </SectionCard>
        </div>

        {/* ── Cột phải sticky: ảnh + tóm tắt tồn kho/đặt hàng — theo mockup "chi tiết SKU 1B",
            luôn thấy được hành động quan trọng nhất (đề xuất đặt lại) mà không phải cuộn qua
            hết các SectionCard nghiệp vụ ở cột trái. ── */}
        <div style={{ width: 280, flexShrink: 0, position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Cảnh báo tồn + CTA — nổi bật nhất, đặt trên cùng cột phải, không bọc SectionCard
              (giống mockup: đây là 1 câu cảnh báo + nút, không phải 1 khối nội dung riêng). */}
          {!isCreate && !invLoading && inv && v && p.product_type !== 'service' && p.product_type !== 'bundle' && v.reorder_point > 0 && inv.qty_available <= v.reorder_point && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 'var(--t2-body)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
                Tình trạng tồn
              </div>
              <span style={{
                display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', fontSize: 'var(--t2-body)',
                letterSpacing: '0.02em', padding: '3px 10px', borderRadius: 2,
                background: 'var(--s-pending-bg)', color: 'var(--s-pending-color)',
              }}>
                Sắp hết
              </span>
              <div style={{ fontSize: 'var(--t2-body)', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Tồn <strong style={{ color: 'var(--text-1)' }}>{inv.qty_on_hand}</strong> / tối thiểu{' '}
                <strong style={{ color: 'var(--text-1)' }}>{v.reorder_point}</strong> {v.unit || 'đơn vị'}.
                {reorderSuggestion?.avg_daily_consumption > 0 && (
                  <> Theo mức tiêu thụ TB {reorderSuggestion.avg_daily_consumption.toFixed(1)}/ngày, dự kiến hết sau{' '}
                  <strong style={{ color: 'var(--s-cancelled-color)' }}>
                    {Math.max(0, Math.round(inv.qty_available / reorderSuggestion.avg_daily_consumption))} ngày
                  </strong>.</>
                )}
              </div>
              <Button
                type="primary"
                block
                onClick={() => navigate(`/receipts/new?variant_id=${variantId}`)}
              >
                Tạo phiếu nhập{reorderSuggestion?.suggested_reorder_point ? ` ${reorderSuggestion.suggested_reorder_point} ${v.unit || ''}` : ''}
              </Button>
            </div>
          )}

          <SectionCard title="Hình ảnh">
            <Form.Item name="image_url" noStyle>
              <ImageUpload disabled={!editable} />
            </Form.Item>
          </SectionCard>

          {!isCreate && p.product_type !== 'service' && p.product_type !== 'bundle' && (
            <SectionCard title="Đề xuất điểm đặt lại">
              {suggLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : reorderSuggestion?.insufficient_data ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-2)', fontSize: 'var(--t2-body)' }}>
                  <InfoCircleOutlined style={{ marginTop: 2 }} />
                  <span>
                    Chưa đủ dữ liệu để tính gợi ý — cần ít nhất 3 lần xuất kho trong {reorderSuggestion.period_days} ngày gần nhất.
                    Hiện tại có <strong>{reorderSuggestion.delivery_count}</strong> lần.
                  </span>
                </div>
              ) : reorderSuggestion ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Điểm đặt lại gợi ý — số nổi bật nhất, đặt lên đầu để scan nhanh trước cả
                      3 số thành phần bên dưới (khác thứ tự cột-ngang cũ vì cột hẹp không đủ
                      chỗ xếp 4 số cạnh nhau). */}
                  <div>
                    <div style={labelStyle}>Điểm đặt lại gợi ý</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
                      {reorderSuggestion.suggested_reorder_point}
                      <span style={{ fontSize: 'var(--t2-strong)', fontWeight: 400, color: 'var(--text-2)', marginLeft: 4 }}>đơn vị</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t2-strong)' }}>
                      <span style={{ color: 'var(--text-2)' }}>
                        Tiêu thụ TB/ngày
                        <Tooltip title={`Tổng xuất kho ${reorderSuggestion.period_days} ngày ÷ ${reorderSuggestion.period_days}`}>
                          <InfoCircleOutlined style={{ marginLeft: 4, opacity: 0.5, cursor: 'help' }} />
                        </Tooltip>
                      </span>
                      <strong style={{ color: 'var(--text-1)' }}>{reorderSuggestion.avg_daily_consumption.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t2-strong)' }}>
                      <span style={{ color: 'var(--text-2)' }}>
                        Lead time TB
                        <Tooltip title="Trung bình ngày từ khi PO được xác nhận đến khi Receipt hoàn thành">
                          <InfoCircleOutlined style={{ marginLeft: 4, opacity: 0.5, cursor: 'help' }} />
                        </Tooltip>
                      </span>
                      <strong style={{ color: 'var(--text-1)' }}>{reorderSuggestion.avg_lead_time_days.toFixed(1)} ngày</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t2-strong)' }}>
                      <span style={{ color: 'var(--text-2)' }}>
                        Tồn kho an toàn
                        <Tooltip title={`Đệm ${reorderSuggestion.safety_stock_days} ngày tiêu thụ để đề phòng biến động`}>
                          <InfoCircleOutlined style={{ marginLeft: 4, opacity: 0.5, cursor: 'help' }} />
                        </Tooltip>
                      </span>
                      <strong style={{ color: 'var(--text-1)' }}>{reorderSuggestion.safety_stock.toFixed(1)}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: 'var(--t2-body)', color: 'var(--text-3)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    Dựa trên {reorderSuggestion.delivery_count} lần xuất · {reorderSuggestion.purchase_count} lần nhập có PO ·
                    {' '}{reorderSuggestion.quotation_count} báo giá / {reorderSuggestion.period_days} ngày
                  </div>

                  <Button
                    type="primary"
                    block
                    icon={<CheckOutlined />}
                    onClick={() => {
                      form.setFieldValue('reorder_point', reorderSuggestion.suggested_reorder_point)
                      if (!isEditing) setIsEditing(true)
                    }}
                  >
                    Áp dụng gợi ý
                  </Button>
                </div>
              ) : null}
            </SectionCard>
          )}

          {!isCreate && (
          <SectionCard title="Hoạt động gần đây">
            {movLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : !recentMovements?.length ? (
              <div style={{ fontSize: 'var(--t2-body)', color: 'var(--text-3)' }}>Chưa có hoạt động nào</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentMovements.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'var(--t2-body)' }}>
                    <span>
                      {m.movement_type === 'in' ? 'Nhập' : 'Xuất'} {m.quantity} {v?.unit || ''}
                      {m.doc_code ? ` · ${m.doc_code}` : ''}
                    </span>
                    <span style={{ color: 'var(--text-2)' }}>
                      {new Date(m.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          )}

          {!isCreate && (
          <SectionCard title="In">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button icon={<PrinterOutlined />} onClick={() => printLabel('tem')}>In tem kệ</Button>
              <Button icon={<PrinterOutlined />} onClick={() => printLabel('barcode')}>In mã vạch</Button>
            </div>
          </SectionCard>
          )}
        </div>

      </div>
      </Form>

      {/* Đưa lên ngay dưới Thông tin SKU theo yêu cầu — trước đây nằm cuối trang, dưới cả
          Thuộc tính/Nhà cung cấp/Giá theo khách hàng, ít liên quan trực tiếp tới các field
          định danh/giá cơ bản ở trên. Nằm ngoài <Form> vì bản thân panel này có <Form> riêng
          — lồng form trong form là HTML không hợp lệ (đã có bug thật khi thử lồng vào trong).
          Ẩn khi tạo mới — cần variantId thật (mô tả riêng theo từng khách hàng của 1 SKU cụ
          thể, chưa có ý nghĩa trước khi SKU tồn tại). */}
      {!isCreate && (
      <SectionCard title="Mô tả theo khách hàng">
        <CustomerDescriptionsPanel productId={productId!} variantId={variantId!} />
      </SectionCard>
      )}

      {/* ── Thuộc tính SKU ── */}
      {hook.attrValues.length > 0 && (
        <SectionCard title="Thuộc tính">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hook.attrValues.map((attr, i) => (
              <div key={attr.attribute_def_id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ width: 140, flexShrink: 0, fontSize: 'var(--t2-body)', color: 'var(--text-2)' }}>{attr.name}</span>
                {attr.field_type === 'text' ? (
                  <Input style={{ width: 160 }} value={attr.value ?? ''} disabled={!editable} onChange={(e) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: e.target.value || null } : a))
                    hook.setAttrValues(next)
                  }} />
                ) : attr.field_type === 'boolean' ? (
                  <Switch checkedChildren="Có" unCheckedChildren="Không" checked={attr.value === 'true'} disabled={!editable} onChange={(checked) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: String(checked) } : a))
                    hook.setAttrValues(next)
                  }} />
                ) : attr.field_type === 'date' ? (
                  <DatePicker style={{ width: 160 }} value={attr.value ? dayjs(attr.value) : null} disabled={!editable} onChange={(d) => {
                    const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: d ? d.format('YYYY-MM-DD') : null } : a))
                    hook.setAttrValues(next)
                  }} />
                ) : (
                  <Select style={{ width: 160 }} allowClear value={attr.value ?? undefined} disabled={!editable}
                    options={attr.options.map((o) => ({ value: o, label: `${o}${attr.unit ?? ''}` }))}
                    onChange={(val) => {
                      const next = hook.attrValues.map((a, j) => (j === i ? { ...a, value: val ?? null } : a))
                      hook.setAttrValues(next)
                    }}
                  />
                )}
                <Checkbox checked={attr.include_in_sku} disabled={!editable} onChange={(e) => {
                  const next = hook.attrValues.map((a, j) => (j === i ? { ...a, include_in_sku: e.target.checked } : a))
                  hook.setAttrValues(next)
                }}>
                  Gắn vào mã
                </Checkbox>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Panels — tất cả cần variantId thật, ẩn khi tạo mới ── */}
      {!isCreate && p.product_type === 'bundle' && (
        <SectionCard title="Sản phẩm con (Bundle)">
          <BundleItemsPanel productId={productId!} variantId={variantId!} />
        </SectionCard>
      )}

      {!isCreate && (
      <SectionCard title="Nhà cung cấp">
        <VariantSuppliersPanel productId={productId!} variantId={variantId!} />
      </SectionCard>
      )}

      {!isCreate && (
      <SectionCard title="Giá theo khách hàng">
        <CustomerPricesPanel productId={productId!} variantId={variantId!} />
      </SectionCard>
      )}
      </>
      )}
    </div>
  )
}
