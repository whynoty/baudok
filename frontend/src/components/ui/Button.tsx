import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  borderRadius: 'var(--radius)',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'background 0.15s',
}

const variantStyles: Record<string, CSSProperties> = {
  primary: { background: 'var(--color-primary)', color: '#fff' },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  danger: { background: 'var(--color-error)', color: '#fff' },
  ghost: { background: 'transparent', color: 'var(--color-text)' },
}

const sizeStyles: Record<string, CSSProperties> = {
  sm: { padding: '4px 10px', fontSize: '12px' },
  md: { padding: '8px 16px', fontSize: '14px' },
  lg: { padding: '12px 24px', fontSize: '16px' },
}

const disabledStyle: CSSProperties = { opacity: 0.6, cursor: 'not-allowed' }

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled ?? loading}
      style={{
        ...base,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...(disabled ?? loading ? disabledStyle : {}),
        ...style,
      }}
    >
      {loading && (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  )
}
