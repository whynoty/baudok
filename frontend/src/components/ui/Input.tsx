import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            outline: 'none',
            transition: 'border-color 0.15s',
            ...style,
          }}
        />
        {error && (
          <span style={{ fontSize: '12px', color: 'var(--color-error)' }}>{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
