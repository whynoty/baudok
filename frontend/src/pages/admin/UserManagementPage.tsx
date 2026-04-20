import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { adminApi } from '../../api/admin'
import type { CreateUserData } from '../../api/admin'
import { Button, Badge, Modal, Input, Select, Spinner } from '../../components/ui'
import type { UserRole } from '../../api/types'

const createUserSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['company_admin', 'supervisor', 'worker']),
  trade: z.string(),
  phone: z.string(),
})

type CreateUserForm = z.infer<typeof createUserSchema>

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'worker', label: 'worker' },
  { value: 'supervisor', label: 'supervisor' },
  { value: 'company_admin', label: 'company_admin' },
]

export default function UserManagementPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) => adminApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setInviteOpen(false)
      reset()
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateUser(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'worker', trade: '', phone: '' },
  })

  function onSubmit(data: CreateUserForm) {
    createMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1>{t('admin.users')}</h1>
        <Button onClick={() => setInviteOpen(true)} type="button">
          {t('admin.inviteUser')}
        </Button>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
              {[t('admin.newUser.firstName', { defaultValue: 'Name' }), t('admin.newUser.email'), t('admin.role.worker'), t('admin.trade'), ''].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr
                key={user.id}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <td style={{ padding: '12px 16px' }}>
                  {user.first_name} {user.last_name}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{user.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant={user.role}>{t(`admin.role.${user.role}`)}</Badge>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {user.trade}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: user.id,
                        is_active: false,
                      })
                    }
                    type="button"
                  >
                    {t('admin.deactivate')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t('admin.newUser.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)} type="button">
              {t('common.cancel')}
            </Button>
            <Button
              form="create-user-form"
              type="submit"
              loading={isSubmitting}
            >
              {t('admin.newUser.submit')}
            </Button>
          </>
        }
      >
        <form
          id="create-user-form"
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <Input
            label={t('admin.newUser.email')}
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('admin.newUser.firstName')}
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label={t('admin.newUser.lastName')}
            error={errors.last_name?.message}
            {...register('last_name')}
          />
          <Select
            label={t('admin.newUser.role')}
            options={ROLE_OPTIONS.map((r) => ({
              value: r.value,
              label: t(`admin.role.${r.value}`),
            }))}
            {...register('role')}
          />
          <Input
            label={t('admin.newUser.trade')}
            {...register('trade')}
          />
          <Input
            label={t('admin.newUser.phone')}
            type="tel"
            {...register('phone')}
          />
        </form>
      </Modal>
    </div>
  )
}
