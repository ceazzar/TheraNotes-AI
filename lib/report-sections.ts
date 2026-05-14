import templateData from '@/lib/template.json'

type SectionTemplate = { name: string; order: number; auto_generate?: boolean }

export type ReportSectionRecord = Record<
  string,
  { title?: string; content?: string } | undefined
>

const orderedSectionNames = (templateData.sections as SectionTemplate[])
  .filter((section) => !section.auto_generate)
  .sort((a, b) => a.order - b.order)
  .map((section) => section.name)

export function orderedReportSectionEntries(sections: ReportSectionRecord) {
  const used = new Set<string>()
  const ordered: Array<[string, NonNullable<ReportSectionRecord[string]>]> = []

  for (const name of orderedSectionNames) {
    const direct = sections[name]
    if (direct) {
      ordered.push([name, direct])
      used.add(name)
      continue
    }

    const fallback = Object.entries(sections).find(
      ([key, section]) => !used.has(key) && section?.title === name,
    )
    if (fallback?.[1]) {
      ordered.push([fallback[0], fallback[1]])
      used.add(fallback[0])
    }
  }

  for (const [key, section] of Object.entries(sections)) {
    if (!used.has(key) && section) ordered.push([key, section])
  }

  return ordered
}

export function reportSectionsToMarkdown(sections: ReportSectionRecord): string {
  return orderedReportSectionEntries(sections)
    .map(([name, section]) => {
      const title = section.title || name
      return `## ${title}\n\n${section.content ?? ''}`
    })
    .join('\n\n')
}
