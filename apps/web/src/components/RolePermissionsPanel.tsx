// Checkbox ma trận permission cho 1 Role — group theo permissions.group. Render trong slot
// `extra` của EntityFormModal sửa Role (ngoài <Form> chính, state riêng).
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Checkbox, Button, Typography, Row, Col } from 'antd'
import { api } from '../lib/api'
import { useApiMutation } from '../hooks/useApiMutation'

interface Props {
  roleId: string
}

export default function RolePermissionsPanel({ roleId }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: role, isLoading } = useQuery({
    queryKey: ['settings', 'roles', roleId],
    queryFn: async () => (await api.get(`/settings/roles/${roleId}`)).data,
  })

  const { data: allPermissions } = useQuery({
    queryKey: ['settings', 'permissions'],
    queryFn: async () => (await api.get('/settings/permissions')).data,
  })

  useEffect(() => {
    if (role) setSelected(new Set(role.permissions.map((p: any) => p.key)))
  }, [role])

  const saveMutation = useApiMutation(
    () => api.put(`/settings/roles/${roleId}/permissions`, { permission_keys: [...selected] }),
    { successMessage: 'Cập nhật quyền thành công', invalidateKey: ['settings', 'roles', roleId] },
  )

  function toggle(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const grouped: Record<string, any[]> = {}
  for (const p of allPermissions ?? []) {
    grouped[p.group] = grouped[p.group] ?? []
    grouped[p.group].push(p)
  }

  if (isLoading) return null

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
      <Typography.Title level={5}>Phân quyền</Typography.Title>

      {Object.entries(grouped).map(([group, perms]) => (
        <div key={group} style={{ marginBottom: 12 }}>
          <Typography.Text strong>{group}</Typography.Text>
          <Row>
            {perms.map((p) => (
              <Col span={8} key={p.id}>
                <Checkbox checked={selected.has(p.key)} onChange={(e) => toggle(p.key, e.target.checked)}>
                  {p.description ?? p.key}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      <Button type="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        Lưu quyền
      </Button>
    </div>
  )
}
