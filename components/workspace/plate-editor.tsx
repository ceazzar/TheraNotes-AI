'use client'

import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  Plate,
  usePlateEditor,
  type PlateEditor as PlateEditorType,
} from 'platejs/react'
import type { Value } from 'platejs'
import { EditorKit } from '@/components/editor/editor-kit'
import { Editor, EditorContainer } from '@/components/ui/editor'

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
      plugins: EditorKit,
      value: initialValue,
    })

    useImperativeHandle(ref, () => ({ editor }), [editor])

    const handleChange = useCallback(() => {
      onChangeRef.current?.()
    }, [])

    return (
      <div className="tn-doc">
        <Plate editor={editor} onChange={handleChange}>
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
