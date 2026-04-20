import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../api/admin'
import { Button, Input, Select, Spinner } from '../../components/ui'
import type { Language } from '../../api/types'

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
]

const settingsSchema = z.object({
  name: z.string().min(1),
  address: z.string(),
  tax_id: z.string(),
  preferred_language: z.enum(['de', 'en', 'es', 'it', 'pt']),
})

type SettingsForm = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => adminApi.getCompany().then((r) => r.data),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      address: '',
      tax_id: '',
      preferred_language: 'de',
    },
  })

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        address: company.address,
        tax_id: company.tax_id,
        preferred_language: company.preferred_language,
      })
    }
  }, [company, reset])

  const updateMutation = useMutation({
    mutationFn: (data: SettingsForm) => adminApi.updateCompany(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <h1 style={{ marginBottom: '24px' }}>{t('admin.company')}</h1>
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <Input
          label={t('admin.company')}
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label={t('admin.companyAddress', { defaultValue: 'Address' })}
          error={errors.address?.message}
          {...register('address')}
        />
        <Input
          label={t('admin.taxId', { defaultValue: 'Tax ID' })}
          error={errors.tax_id?.message}
          {...register('tax_id')}
        />
        <Select
          label={t('language.label')}
          options={LANGUAGE_OPTIONS}
          {...register('preferred_language')}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isDirty}
          >
            {t('common.save')}
          </Button>
          {updateMutation.isSuccess && (
            <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--color-success)' }}>
              {t('common.success')}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
