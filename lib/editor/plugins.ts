import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  HighlightPlugin,
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HorizontalRulePlugin,
} from '@platejs/basic-nodes/react'
import { ListPlugin } from '@platejs/list/react'
import {
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
} from '@platejs/table/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { BlockSelectionPlugin } from '@platejs/selection/react'

import { ParagraphElement } from '@/components/ui/paragraph-node'
import { H1Element, H2Element, H3Element, H4Element, H5Element, H6Element } from '@/components/ui/heading-node'
import { BlockquoteElement } from '@/components/ui/blockquote-node'
import { HrElement } from '@/components/ui/hr-node'
import {
  TableElement,
  TableRowElement,
  TableCellElement,
  TableCellHeaderElement,
} from '@/components/ui/table-node'
import { BlockList } from '@/components/ui/block-list'

import { ParagraphPlugin } from 'platejs/react'

export const editorPlugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.withComponent(H1Element),
  H2Plugin.withComponent(H2Element),
  H3Plugin.withComponent(H3Element),
  H4Plugin.withComponent(H4Element),
  H5Plugin.withComponent(H5Element),
  H6Plugin.withComponent(H6Element),
  BlockquotePlugin.withComponent(BlockquoteElement),
  HorizontalRulePlugin.withComponent(HrElement),
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  HighlightPlugin,
  ListPlugin.configure({
    render: {
      belowNodes: BlockList,
    },
  }),
  TablePlugin.withComponent(TableElement).configure({
    plugins: {
      [TableRowPlugin.key]: {
        render: { node: TableRowElement },
      },
      [TableCellPlugin.key]: {
        render: { node: TableCellElement },
      },
      [TableCellHeaderPlugin.key]: {
        render: { node: TableCellHeaderElement },
      },
    },
  }),
  BlockSelectionPlugin,
  MarkdownPlugin,
]
