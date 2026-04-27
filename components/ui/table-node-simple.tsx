'use client'

import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'
import { cn } from '@/lib/utils'

export function SimpleTableElement({ className, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="table"
      className={cn(
        'my-4 w-full table-fixed border-collapse text-sm',
        className
      )}
      {...props}
    >
      <tbody>{props.children}</tbody>
    </PlateElement>
  )
}

export function SimpleTableRowElement({ className, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="tr"
      className={cn('border-b border-border', className)}
      {...props}
    >
      {props.children}
    </PlateElement>
  )
}

export function SimpleTableCellElement({ className, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="td"
      className={cn(
        'border border-border px-3 py-2 text-left align-top',
        'first:font-medium first:text-muted-foreground',
        className
      )}
      {...props}
    >
      {props.children}
    </PlateElement>
  )
}
