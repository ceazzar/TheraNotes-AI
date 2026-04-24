'use client'

import { useState, useCallback } from 'react'
import {
  FileUpload,
  FileUploadTrigger,
  FileUploadContent,
} from '@/components/ui/file-upload'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { Upload } from 'lucide-react'

interface ExemplarUploadProps {
  onUploadComplete: () => void
}

export function ExemplarUpload({ onUploadComplete }: ExemplarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      const file = files[0]

      setIsUploading(true)
      setResult(null)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res: Response = await fetch('/api/ingest', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (res.ok) {
          setResult({
            success: true,
            message: `Uploaded "${data.fileName}" - ${data.chunksCreated} chunks created.`,
          })
          onUploadComplete()
        } else {
          setResult({
            success: false,
            message: data.error || 'Upload failed',
          })
        }
      } catch {
        setResult({ success: false, message: 'Network error during upload.' })
      } finally {
        setIsUploading(false)
      }
    },
    [onUploadComplete]
  )

  return (
    <div className="space-y-4">
      <FileUpload
        onFilesAdded={handleFilesAdded}
        multiple={false}
        accept=".pdf,.docx,.txt"
      >
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 text-center">
          <Upload className="size-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop an exemplar report here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports PDF, DOCX, and TXT files
            </p>
          </div>
          <FileUploadTrigger asChild>
            <Button variant="outline" size="sm" disabled={isUploading}>
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <Loader variant="circular" size="sm" />
                  Uploading...
                </span>
              ) : (
                'Browse Files'
              )}
            </Button>
          </FileUploadTrigger>
        </div>
        <FileUploadContent>
          <div className="flex flex-col items-center gap-2 text-foreground">
            <Upload className="size-12" />
            <p className="text-lg font-medium">Drop your file here</p>
          </div>
        </FileUploadContent>
      </FileUpload>

      {result && (
        <div
          className={`rounded-md p-3 text-sm ${
            result.success
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}
