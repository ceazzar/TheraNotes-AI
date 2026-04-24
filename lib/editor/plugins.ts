import { BasicBlocksPlugin, BasicMarksPlugin } from '@platejs/basic-nodes/react'
import { ListPlugin } from '@platejs/list/react'
import { TablePlugin } from '@platejs/table/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { BlockSelectionPlugin } from '@platejs/selection/react'

export const editorPlugins = [
  BasicBlocksPlugin,
  BasicMarksPlugin,
  ListPlugin,
  TablePlugin,
  BlockSelectionPlugin,
  MarkdownPlugin,
]
