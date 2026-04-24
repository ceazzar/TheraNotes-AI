'use client'

import { useState } from 'react'
import { Wand2, Pencil, Copy, MoreHorizontal } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'

interface ReportSectionProps {
  sectionId: string
  sectionNumber: number
  title: string
  content: string
  reportId: string
  onRevise: (sectionId: string, feedback: string) => void
  onDirectEdit: (sectionId: string, newContent: string) => void
  isRevising: boolean
}

export function ReportSection({
  sectionId,
  sectionNumber,
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
    <div className="group">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mt-7 mb-2.5 pb-2 border-b border-[#F1F5F9]">
        <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[#EFF6FF] font-mono text-[11px] font-semibold text-[#2563EB]">
          {sectionNumber}
        </div>
        <h2
          className="flex-1 text-[20px] font-bold tracking-tight text-[#0F172A]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            margin: 0,
          }}
        >
          {title}
        </h2>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-70 transition-opacity">
          <button
            onClick={() => setShowReviseInput(!showReviseInput)}
            disabled={isRevising}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
            title="Revise with AI"
          >
            <Wand2 className="size-3.5" />
          </button>
          <button
            onClick={() => {
              if (isEditing) {
                handleCancelEdit()
              } else {
                setEditContent(content)
                setIsEditing(true)
              }
            }}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
            title="Edit"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
            title="Copy"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
            title="More"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[200px] rounded-lg border border-[#E2E8F0] bg-white p-4 text-[15px] leading-[1.75] text-[#0F172A] resize-y focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#1D4ED8]"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '15.5px',
            lineHeight: 1.75,
            color: '#0F172A',
          }}
        >
          <Markdown>{content}</Markdown>
        </div>
      )}

      {/* Revise input */}
      {showReviseInput && (
        <div className="mt-4 space-y-2 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2563EB] text-white">
              <Wand2 className="size-3" />
            </div>
            <span className="text-[13px] font-semibold text-[#0F172A]">
              Revise with AI
            </span>
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what you want changed…"
            className="w-full min-h-[80px] rounded-lg border border-[#DBEAFE] bg-white p-3 text-[13px] text-[#0F172A] resize-y focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
          />
          <div className="flex justify-end">
            <button
              onClick={handleRevise}
              disabled={isRevising || !feedback.trim()}
              className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#1D4ED8] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
            >
              {isRevising ? 'Revising…' : 'Submit Revision'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
