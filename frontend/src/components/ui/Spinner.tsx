import type { CSSProperties } from 'react'

interface SpinnerProps {
  size?: number
  color?: string
  style?: CSSProperties
}

export function Spinner({ size = 24, color = 'var(--color-primary)', style }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `3px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
