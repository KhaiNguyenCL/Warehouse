// Dùng chung cho mọi mutation create/update/delete đơn giản trên các trang CRUD —
// chuẩn hoá 3 bước lặp lại ở mọi trang: hiện message thành công, invalidate query liên
// quan, hiện message lỗi lấy từ response.error. Không bọc onSuccess logic riêng biệt
// (vd đóng modal) ở đây — truyền qua onSuccess để mỗi trang tự quyết việc đó.
import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query'
import { message } from 'antd'

// TVariables mặc định = void (không any) — để mutationFn 0 tham số (vd các action
// submit/approve/confirm/cancel chỉ cần PATCH không kèm body) cho ra mutate() gọi không
// cần đối số, đúng như hành vi useMutation gốc. Khi mutationFn CÓ tham số (vd
// `(values: any) => ...`), TS tự suy luận lại TVariables từ đó nên vẫn đúng.
export function useApiMutation<TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  // invalidateKey nhận 1 key hoặc nhiều key — vd các action Submit/Approve/Complete/
  // Cancel ở trang detail (ReceiptDetailPage/PurchaseOrderDetailPage) luôn cần invalidate
  // CẢ query detail (['receipts', id]) VÀ query list (['receipts']) cùng lúc.
  options: { successMessage: string; invalidateKey: QueryKey | QueryKey[]; onSuccess?: (data: any) => void },
) {
  const qc = useQueryClient()
  const keys = Array.isArray(options.invalidateKey[0]) ? (options.invalidateKey as QueryKey[]) : [options.invalidateKey as QueryKey]
  return useMutation({
    mutationFn,
    onSuccess: (data: any) => {
      message.success(options.successMessage)
      keys.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      options.onSuccess?.(data)
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })
}
