'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'

interface ReportSectionProps {
  sectionId: string
  title: string
  content: string
  reportId: string
  onRevise: (sectionId: string, feedback: string) => void
  onDirectEdit: (sectionId: string, newContent: string) => void
  isRevising: boolean
}

export function ReportSection({
  sectionId,
  title,
  content,
  onRevise,
  onDirectEdit,
  isRevising,
}: ReportSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [showReviseInput, setShowReviseInput] = useState(false)
  const [feedback, setFeedback] = useState('')

  const handleSaveEdit = () => {
    onDirectEdit(sectionId, editContent)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(content)
    setIsEditing(false)
  }

  const handleRevise = () => {
    if (!feedback.trim()) return
    onRevise(sectionId, feedback)
    setFeedback('')
    setShowReviseInput(false)
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              if (isEditing) {
                handleCancelEdit()
              } else {
                setEditContent(content)
                setIsEditing(true)
              }
            }}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowReviseInput(!showReviseInput)}
            disabled={isRevising}
          >
            Revise
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[200px] rounded-md border border-input bg-background p-3 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end">
            <Button variant="default" size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-sm text-foreground/90">
          <Markdown>{content}</Markdown>
        </div>
      )}

      {showReviseInput && (
        <div className="space-y-2 border-t border-border pt-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what you want changed..."
            className="w-full min-h-[80px] rounded-md border border-input bg-background p-3 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={handleRevise}
              disabled={isRevising || !feedback.trim()}
            >
              {isRevising ? 'Revising...' : 'Submit Revision'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
