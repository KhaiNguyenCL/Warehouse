import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from './useApiMutation'
import { useEntityModal } from './useEntityModal'

export function useTemplates() {
  const qc = useQueryClient()
  const { open, editing, form, openEdit, close } = useEntityModal()
  const [detectedVariables, setDetectedVariables] = useState<string[] | undefined>(undefined)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadObjectType, setUploadObjectType] = useState<string>('quotation')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
  })

  // Cần đọc response (detected_variables, id) để mở luôn mapping editor sau khi upload —
  // useApiMutation không trả data qua onSuccess nên dùng useMutation trực tiếp ở đây.
  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('name', uploadName)
      fd.append('object_type', uploadObjectType)
      fd.append('file', uploadFile as File)
      return (await api.post('/templates', fd)).data
    },
    onSuccess: (template: any) => {
      message.success('Tải lên template thành công')
      qc.invalidateQueries({ queryKey: ['templates'] })
      setUploadOpen(false)
      setUploadName('')
      setUploadFile(null)
      setDetectedVariables(template.detected_variables)
      openEdit(template)
    },
    onError: (err: any) => message.error(err.response?.data?.error ?? 'Lỗi'),
  })

  const updateMutation = useApiMutation((values: any) => api.patch(`/templates/${editing.id}`, values), {
    successMessage: 'Cập nhật thành công',
    invalidateKey: ['templates'],
    onSuccess: close,
  })

  const toggleMutation = useApiMutation(
    (vars: { id: string; field: 'is_active' | 'is_default'; value: boolean }) =>
      api.patch(`/templates/${vars.id}`, { [vars.field]: vars.value }),
    { successMessage: 'Cập nhật thành công', invalidateKey: ['templates'] },
  )

  return {
    open, editing, form, openEdit, close,
    detectedVariables, setDetectedVariables,
    uploadOpen, setUploadOpen,
    uploadName, setUploadName,
    uploadObjectType, setUploadObjectType,
    uploadFile, setUploadFile,
    data, isLoading,
    uploadMutation, updateMutation, toggleMutation,
  }
}
