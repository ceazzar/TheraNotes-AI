'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

type Exemplar = {
  source_file: string
  chunk_count: number
}

interface ExemplarListProps {
  refreshKey: number
}

export function ExemplarList({ refreshKey }: ExemplarListProps) {
  const [exemplars, setExemplars] = useState<Exemplar[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchExemplars = useCallback(async (): Promise<Exemplar[]> => {
    const { data } = await supabase
      .from('exemplar_chunks')
      .select('source_file')

    if (!data) return []

    const grouped = data.reduce(
      (acc: Record<string, number>, row) => {
        acc[row.source_file] = (acc[row.source_file] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(grouped).map(([source_file, chunk_count]) => ({
      source_file,
      chunk_count,
    }))
  }, [supabase])

  useEffect(() => {
    let isActive = true

    void fetchExemplars().then((nextExemplars) => {
      if (!isActive) return
      setExemplars(nextExemplars)
      setIsLoading(false)
    })

    return () => {
      isActive = false
    }
  }, [fetchExemplars, refreshKey])

  const reloadExemplars = useCallback(() => {
    setIsLoading(true)
    void fetchExemplars().then((nextExemplars) => {
      setExemplars(nextExemplars)
      setIsLoading(false)
    })
  }, [fetchExemplars])

  const handleDelete = async (sourceFile: string) => {
    const { error } = await supabase
      .from('exemplar_chunks')
      .delete()
      .eq('source_file', sourceFile)

    if (!error) {
      // Also remove from storage
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.storage
          .from('exemplars')
          .remove([`${user.id}/${sourceFile}`])
      }
      reloadExemplars()
    }
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading exemplars...</p>
    )
  }

  if (exemplars.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No exemplars uploaded yet. Upload an exemplar report above to improve
        generation quality.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {exemplars.map((exemplar) => (
        <div
          key={exemplar.source_file}
          className="flex items-center justify-between rounded-md border border-border p-3"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              {exemplar.source_file}
            </p>
            <p className="text-xs text-muted-foreground">
              {exemplar.chunk_count} chunk{exemplar.chunk_count !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleDelete(exemplar.source_file)}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  )
}
