export interface ReportSection {
  id: string
  title: string
}

export interface Flag {
  id: string
  sev: 'critical' | 'warning' | 'suggestion'
  section: string
  title: string
  desc: string
  fix: string
  rationale: string
  refined: string
  originalText: string
  resolved: boolean
}

export interface FlagPreview {
  state: 'preview' | 'accepted'
  text: string
}

export interface Participant {
  name: string
  ndisNumber: string
  assessor: string
  reportDate: string
}
