import { z } from 'zod'
import { tool } from 'ai'

export const chatTools = {
  generate_report: tool({
    description: 'Generate an FCA report from the clinical notes gathered in the conversation. Call this when the user has provided enough clinical information to start report generation.',
    inputSchema: z.object({
      clinicalNotes: z.string().describe('The full clinical notes gathered from the conversation'),
      questionnaireData: z.string().optional().describe('Any questionnaire data if provided'),
    }),
  }),
  revise_section: tool({
    description: 'Revise a specific section of the generated report based on user feedback.',
    inputSchema: z.object({
      sectionId: z.string().describe('The section ID to revise'),
      feedback: z.string().describe('The user feedback describing what to change'),
    }),
  }),
  get_report_status: tool({
    description: 'Check the current status of the report being generated.',
    inputSchema: z.object({}),
  }),
  record_correction: tool({
    description: 'Record a clinician correction for future learning. Call this after a section is revised to store what changed and why.',
    inputSchema: z.object({
      sectionId: z.string().describe('The section that was revised'),
      originalText: z.string().describe('The text before revision'),
      revisedText: z.string().describe('The text after revision'),
      feedback: z.string().describe('The clinician feedback that prompted the change'),
    }),
  }),
  get_past_corrections: tool({
    description: 'Check if this clinician has been corrected on similar issues before.',
    inputSchema: z.object({
      section: z.string().describe('The section type to check'),
    }),
  }),
}
