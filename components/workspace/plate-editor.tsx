'use client'

import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  Plate,
  usePlateEditor,
  type PlateEditor as PlateEditorType,
} from 'platejs/react'
import type { Value } from 'platejs'
import { editorPlugins } from '@/lib/editor/plugins'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { EditorToolbar } from './editor-toolbar'

interface PlateEditorProps {
  initialValue: Value
  onChange?: () => void
  readOnly?: boolean
}

export interface PlateEditorHandle {
  editor: PlateEditorType
}

export const PlateDocEditor = forwardRef<PlateEditorHandle, PlateEditorProps>(
  function PlateDocEditor({ initialValue, onChange, readOnly = false }, ref) {
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    const editor = usePlateEditor({
      plugins: editorPlugins,
      value: initialValue,
    })

    useImperativeHandle(ref, () => ({ editor }), [editor])

    const handleChange = useCallback(() => {
      onChangeRef.current?.()
    }, [])

    return (
      <div className="tn-doc">
        <Plate editor={editor} onChange={handleChange}>
          <EditorToolbar />
          <EditorContainer>
            <Editor
              readOnly={readOnly}
              variant="fullWidth"
              className="tn-plate-editor"
            />
          </EditorContainer>
        </Plate>
      </div>
    )
  }
)
