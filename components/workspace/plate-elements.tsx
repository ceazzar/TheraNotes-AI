/**
 * Plate element components for the workspace editor.
 *
 * Plate's TablePlugin from `@platejs/table/react` registers schema for
 * 'table' / 'tr' / 'td' / 'th' nodes, but does NOT auto-bind React components
 * — without a binding, Plate falls back to inline rendering and the document
 * shows table cells as flat vertical text. The clinician QA review surfaced
 * this as a P0 because the deterministic Phase B Header section is a markdown
 * table and was unreadable in the workspace.
 *
 * The CSS in `app/globals.css` (`.tn-doc table`, `.tn-doc thead th`, etc.) was
 * already styled for tables; the gap was the missing component wiring.
 */

import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'

export function TableElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="table">
      <tbody>{props.children}</tbody>
    </PlateElement>
  )
}

export function TableRowElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="tr">
      {props.children}
    </PlateElement>
  )
}

export function TableCellElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="td">
      {props.children}
    </PlateElement>
  )
}

export function TableHeaderCellElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="th">
      {props.children}
    </PlateElement>
  )
}
