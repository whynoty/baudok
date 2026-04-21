import { useState, useEffect, useRef, useCallback } from 'react'
import { useMaterials } from '../../hooks/useCatalog'
import type { MaterialItem } from '../../api/types'

interface MaterialAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function MaterialAutocomplete({
  value,
  onChange,
  placeholder,
}: MaterialAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounce(inputValue, 300)
  const { data: materials = [] } = useMaterials(
    debouncedSearch.trim() || undefined
  )

  // Keep internal input in sync when external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    onChange(e.target.value)
    setIsOpen(true)
  }

  const handleSelect = useCallback(
    (item: MaterialItem) => {
      setInputValue(item.name)
      onChange(item.name)
      setIsOpen(false)
    },
    [onChange]
  )

  const handleBlur = (e: React.FocusEvent) => {
    // Close only if focus leaves the entire container
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const showDropdown = isOpen && materials.length > 0

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }} onBlur={handleBlur}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue.trim() && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {showDropdown && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 500,
            listStyle: 'none',
            margin: 0,
            padding: '4px 0',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {materials.map((item) => (
            <li
              key={item.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                // Prevent blur before click registers
                e.preventDefault()
                handleSelect(item)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLLIElement).style.background =
                  'var(--color-primary-light)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLLIElement).style.background = 'transparent'
              }}
            >
              <span>{item.name}</span>
              <span
                style={{
                  fontSize: '11px',
                  background: 'var(--color-border)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  color: 'var(--color-text-muted)',
                  marginLeft: '8px',
                  flexShrink: 0,
                }}
              >
                {item.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
