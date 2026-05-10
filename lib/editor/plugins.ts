import { BasicBlocksPlugin, BasicMarksPlugin } from '@platejs/basic-nodes/react'
import { ListPlugin } from '@platejs/list/react'
import { TablePlugin } from '@platejs/table/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { BlockSelectionPlugin } from '@platejs/selection/react'
import { KEYS } from 'platejs'
import {
  TableElement,
  TableRowElement,
  TableCellElement,
  TableHeaderCellElement,
} from '@/components/workspace/plate-elements'

// Bind React components to the table schema so cells render as proper
// <table>/<tr>/<td>/<th> elements. Without these overrides Plate falls back
// to a generic block, which renders cell text inline and produces the
// "flat vertical text" rendering the clinician QA review flagged as P0.
const TablePluginConfigured = TablePlugin.withComponent(TableElement).extend(
  ({ editor }) => ({
    override: {
      components: {
        [editor.getType(KEYS.tr)]: TableRowElement,
        [editor.getType(KEYS.td)]: TableCellElement,
        [editor.getType(KEYS.th)]: TableHeaderCellElement,
      },
    },
  })
)

export const editorPlugins = [
  BasicBlocksPlugin,
  BasicMarksPlugin,
  ListPlugin,
  TablePluginConfigured,
  BlockSelectionPlugin,
  MarkdownPlugin,
]
