'use client'

/**
 * Select primitive — wraps Base UI Select with the project's tn-* token system.
 *
 * Why this exists: Day 1 review flagged that 5 raw <select> on /generate gave
 * the form a "spreadsheet" feel — native selects render with the OS's default
 * dropdown, focus ring, and chevron, none of which match the rest of the app.
 * Base UI's Select renders into a portal and lets us style every part.
 *
 * Designed to be a minimal drop-in: import { Select } and use it like
 *
 *   <Select value={x} onValueChange={setX} placeholder="— select —">
 *     <SelectItem value="foo">Foo</SelectItem>
 *   </Select>
 */

import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  children: React.ReactNode
  /** Optional aria-label when no visible label wraps the field. */
  'aria-label'?: string
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  disabled,
  className,
  triggerClassName,
  children,
  'aria-label': ariaLabel,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => onValueChange?.(v ?? '')}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'tn-select-trigger',
          'flex w-full items-center justify-between rounded-md border border-[var(--tn-line-soft)] bg-[var(--tn-bg)] px-3 py-2 text-sm text-[var(--tn-ink)]',
          'min-h-[36px]',
          'hover:border-[var(--tn-line)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tn-accent,_#3b82f6)]/30 focus-visible:border-[var(--tn-accent,_#3b82f6)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          triggerClassName,
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={14} className="text-[var(--tn-muted-2)]" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6}>
          <SelectPrimitive.Popup
            className={cn(
              'z-50 min-w-[var(--anchor-width)] max-h-[280px] overflow-y-auto',
              'rounded-md border border-[var(--tn-line-soft)] bg-[var(--tn-bg-raised)] shadow-lg',
              'p-1',
              'data-open:animate-in data-open:fade-in-0',
            )}
          >
            {children}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export function SelectItem({ value, children, disabled, className }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--tn-ink)]',
        'data-highlighted:bg-[var(--tn-bg-soft,_#f5f5f5)] data-highlighted:outline-none',
        'data-disabled:opacity-50 data-disabled:cursor-not-allowed',
        className,
      )}
    >
      <SelectPrimitive.ItemIndicator className="flex w-4 justify-center">
        <Check size={12} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
