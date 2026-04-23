'use client'

import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from '@/components/ui/prompt-input'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <PromptInput
          value={value}
          onValueChange={onChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          className="w-full"
        >
          <PromptInputTextarea
            placeholder="Describe the clinical notes or ask about the report..."
          />
          <PromptInputActions className="justify-end px-2 pb-2">
            <Button
              variant="default"
              size="icon-sm"
              onClick={(e) => {
                e.preventDefault()
                onSubmit()
              }}
              disabled={isLoading || !value.trim()}
            >
              <Send className="size-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}
