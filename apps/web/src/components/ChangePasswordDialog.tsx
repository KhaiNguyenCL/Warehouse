// Đổi mật khẩu tự phục vụ — bất kỳ user nào cũng đổi được mật khẩu chính mình,
// miễn nhập đúng mật khẩu hiện tại (khác PATCH /settings/users/:id chỉ admin mới gọi được).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useApiMutation } from '@/hooks/useApiMutation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

const schema = z.object({
  current_password: z.string().min(1, 'Nhập mật khẩu hiện tại'),
  new_password: z.string().min(6, 'Tối thiểu 6 ký tự'),
  confirm_password: z.string().min(1, 'Nhập lại mật khẩu mới'),
}).refine((v) => v.new_password === v.confirm_password, {
  message: 'Mật khẩu nhập lại không khớp',
  path: ['confirm_password'],
})
type ChangePasswordForm = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  const changeMutation = useApiMutation(
    (values: { current_password: string; new_password: string }) =>
      api.patch('/auth/me/password', values),
    {
      successMessage: 'Đổi mật khẩu thành công',
      onSuccess: () => { form.reset(); onOpenChange(false) },
    },
  )

  function onSubmit(values: ChangePasswordForm) {
    changeMutation.mutate({ current_password: values.current_password, new_password: values.new_password })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) form.reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField control={form.control} name="current_password" render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu hiện tại</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="new_password" render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu mới</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirm_password" render={({ field }) => (
              <FormItem>
                <FormLabel>Nhập lại mật khẩu mới</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
              <Button type="submit" disabled={changeMutation.isPending}>Đổi mật khẩu</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
