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
}
