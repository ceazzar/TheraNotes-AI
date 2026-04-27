import { ListPlugin } from '@platejs/list/react'
import { TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin } from '@platejs/table/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { BlockSelectionPlugin } from '@platejs/selection/react'
import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit'
import {
  SimpleTableElement,
  SimpleTableRowElement,
  SimpleTableCellElement,
} from '@/components/ui/table-node-simple'

export const editorPlugins = [
  ...BasicNodesKit,
  ListPlugin,
  TablePlugin.configure({
    node: { component: SimpleTableElement },
    plugins: {
      [TableRowPlugin.key]: { node: { component: SimpleTableRowElement } },
      [TableCellPlugin.key]: { node: { component: SimpleTableCellElement } },
      [TableCellHeaderPlugin.key]: { node: { component: SimpleTableCellElement } },
    },
  }),
  BlockSelectionPlugin,
  MarkdownPlugin,
]
