'use client';

import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react';

import {
  SimpleTableCellElement,
  SimpleTableElement,
  SimpleTableRowElement,
} from '@/components/ui/table-node-simple';

export const TableKit = [
  TablePlugin.withComponent(SimpleTableElement),
  TableRowPlugin.withComponent(SimpleTableRowElement),
  TableCellPlugin.withComponent(SimpleTableCellElement),
  TableCellHeaderPlugin.withComponent(SimpleTableCellElement),
];
