import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { Button, Input } from '../../components/ui'
import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    try {
      await login(data.email, data.password)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('root', { message: t('login.error') })
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: '16px',
      }}
    >
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <LanguageSwitcher />
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)',
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginBottom: '8px',
            }}
          >
            {t('login.title')}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            {t('login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label={t('login.email')}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('login.password')}
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {errors.root && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  background: '#f8d7da',
                  border: '1px solid #f5c2c7',
                  borderRadius: 'var(--radius)',
                  color: 'var(--color-error)',
                  fontSize: '13px',
                }}
              >
                {errors.root.message}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isSubmitting ? t('login.loading') : t('login.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
