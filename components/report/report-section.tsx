'use client'

import { useState } from 'react'
import { Pencil, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Markdown } from '@/components/ui/markdown'

interface ReportSectionProps {
  sectionId: string
  title: string
  content: string
  insufficientData?: boolean
  onRevise: (sectionId: string) => void
  onEdit: (sectionId: string, content: string) => void
}

export function ReportSection({
  sectionId,
  title,
  content,
  insufficientData,
  onRevise,
  onEdit,
}: ReportSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)

  const handleSave = () => {
    onEdit(sectionId, editContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditContent(content)
    setIsEditing(false)
  }

  return (
    <div className="group border-b border-border py-5 last:border-b-0">
      {/* Section header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">
            {title}
          </h3>
          {insufficientData && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
              Insufficient Data
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRevise(sectionId)}
            title="Revise with AI"
          >
            <Wand2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              if (isEditing) {
                handleCancel()
              } else {
                setEditContent(content)
                setIsEditing(true)
              }
            }}
            title="Edit"
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[200px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <Markdown>{content}</Markdown>
        </div>
      )}
    </div>
  )
}
