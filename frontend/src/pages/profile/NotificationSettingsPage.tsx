import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RoleGuard from '../../components/auth/RoleGuard'
import { Spinner } from '../../components/ui'
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useNotificationSubscription,
} from '../../hooks/useNotifications'

// ToggleRow — simple inline toggle control
interface ToggleRowProps {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}

function ToggleRow({ id, label, checked, disabled = false, onChange }: ToggleRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <label htmlFor={id} style={{ fontSize: '14px', color: 'var(--color-text)', cursor: disabled ? 'default' : 'pointer' }}>
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: checked ? 'var(--color-primary)' : 'var(--color-border)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  )
}

export default function NotificationSettingsPage() {
  const { t } = useTranslation()
  const { data: prefs, isLoading: prefsLoading, isError } = useNotificationPrefs()
  const { mutateAsync: savePrefs, isPending: isSaving } = useUpdateNotificationPrefs()
  const { isSupported, isSubscribed, isLoading: subLoading, subscribe, unsubscribe } =
    useNotificationSubscription()

  const [savedConfirm, setSavedConfirm] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reminderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // permission state: 'default' | 'granted' | 'denied'
  const permission =
    typeof Notification !== 'undefined' ? Notification.permission : 'default'

  function showSavedConfirmation() {
    setSavedConfirm(true)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = setTimeout(() => setSavedConfirm(false), 2000)
  }

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      if (reminderDebounceRef.current) clearTimeout(reminderDebounceRef.current)
    }
  }, [])

  async function handlePushToggle(next: boolean) {
    if (next) {
      await subscribe()
    } else {
      await unsubscribe()
    }
    await savePrefs({ push_enabled: next })
    showSavedConfirmation()
  }

  async function handlePrefToggle(field: 'daily_reminder' | 'email_fallback' | 'supervisor_alerts', next: boolean) {
    await savePrefs({ [field]: next })
    showSavedConfirmation()
  }

  function handleReminderTimeChange(value: string) {
    // Append seconds to match "HH:MM:SS" format expected by backend
    const normalized = value.length === 5 ? `${value}:00` : value
    if (reminderDebounceRef.current) clearTimeout(reminderDebounceRef.current)
    reminderDebounceRef.current = setTimeout(async () => {
      await savePrefs({ reminder_time: normalized })
      showSavedConfirmation()
    }, 1000)
  }

  if (prefsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (isError || !prefs) {
    return (
      <div role="alert" style={{ padding: 16, color: 'var(--color-error, #c0392b)' }}>
        {t('common.error')}
      </div>
    )
  }

  const isBusy = isSaving || subLoading

  return (
    <div style={{ maxWidth: 560, padding: '24px 16px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: 24, color: 'var(--color-text)' }}>
        {t('notifications.title')}
      </h1>

      {/* Push enable / disable */}
      {!isSupported ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          {t('notifications.notSupported')}
        </p>
      ) : permission === 'denied' ? (
        <p
          role="alert"
          style={{ fontSize: '13px', color: 'var(--color-error, #c0392b)', marginBottom: 16 }}
        >
          {t('notifications.permissionDenied')}
        </p>
      ) : (
        <ToggleRow
          id="push-enabled"
          label={t('notifications.pushEnabled')}
          checked={isSubscribed}
          disabled={isBusy}
          onChange={handlePushToggle}
        />
      )}

      {/* Daily reminder */}
      <ToggleRow
        id="daily-reminder"
        label={t('notifications.dailyReminder')}
        checked={prefs.daily_reminder}
        disabled={isBusy}
        onChange={(next) => handlePrefToggle('daily_reminder', next)}
      />

      {/* Reminder time — only when daily_reminder is on */}
      {prefs.daily_reminder && (
        <div
          style={{
            padding: '12px 0',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <label
            htmlFor="reminder-time"
            style={{ fontSize: '14px', color: 'var(--color-text)' }}
          >
            {t('notifications.reminderTime')}
          </label>
          <input
            id="reminder-time"
            type="time"
            defaultValue={prefs.reminder_time.slice(0, 5)}
            onChange={(e) => handleReminderTimeChange(e.target.value)}
            disabled={isBusy}
            style={{
              fontSize: '14px',
              padding: '4px 8px',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
        </div>
      )}

      {/* Email fallback */}
      <ToggleRow
        id="email-fallback"
        label={t('notifications.emailFallback')}
        checked={prefs.email_fallback}
        disabled={isBusy}
        onChange={(next) => handlePrefToggle('email_fallback', next)}
      />

      {/* Supervisor alerts — only for supervisor or company_admin */}
      <RoleGuard roles={['supervisor', 'company_admin']}>
        <ToggleRow
          id="supervisor-alerts"
          label={t('notifications.supervisorAlerts')}
          checked={prefs.supervisor_alerts}
          disabled={isBusy}
          onChange={(next) => handlePrefToggle('supervisor_alerts', next)}
        />
      </RoleGuard>

      {/* Inline saved confirmation */}
      <div
        style={{
          marginTop: 16,
          minHeight: 20,
          fontSize: '13px',
          color: 'var(--color-primary)',
          transition: 'opacity 0.3s',
          opacity: savedConfirm ? 1 : 0,
        }}
        aria-live="polite"
      >
        {t('notifications.saved')}
      </div>
    </div>
  )
}
