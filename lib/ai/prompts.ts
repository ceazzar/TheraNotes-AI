/**
 * All LLM prompt templates for the FCA Agent.
 *
 * Ported from src/prompts.py — every clinical instruction, NDIS compliance
 * rule and writing-style guideline is preserved verbatim.
 */

export interface PromptPair {
  system: string;
  user: string;
}

// ---------------------------------------------------------------------------
// Template extraction
// ---------------------------------------------------------------------------

export function buildTemplateExtractionPrompt(
  exemplarTexts: string[],
): PromptPair {
  const numbered = exemplarTexts
    .map((text, i) => `--- EXEMPLAR ${i + 1} ---\n${text}`)
    .join("\n\n");

  return {
    system:
      "You are an expert clinical document analyst. Analyze the provided FCA " +
      "(Functional Capacity Assessment) reports and identify the common structure.\n\n" +
      "Identify ALL sections that appear across these reports, their typical ordering, " +
      "and what type of content belongs in each section.\n\n" +
      "Return your response as JSON with this exact structure:\n" +
      '{"sections": [{"name": "Section Name", "description": "What content belongs here", ' +
      '"typical_length": "N paragraphs"}]}\n\n' +
      "Order sections by their typical position in the report. Use the most common " +
      "heading name when reports vary.",
    user: `Analyze these FCA reports and identify the common section structure:\n\n${numbered}`,
  };
}

// ---------------------------------------------------------------------------
// Template validation
// ---------------------------------------------------------------------------

export function buildTemplateValidationPrompt(
  candidateSections: Record<string, unknown>[],
  exemplarTexts: string[],
): PromptPair {
  const sectionsJson = JSON.stringify(candidateSections, null, 2);
  const numbered = exemplarTexts
    .map((text, i) => `--- EXEMPLAR ${i + 1} ---\n${text}`)
    .join("\n\n");

  return {
    system:
      "You are an expert clinical document analyst. Verify this candidate " +
      "template structure against a different set of exemplar reports.\n\n" +
      "Check:\n" +
      "1. Do all sections in the template appear in these reports?\n" +
      "2. Are there sections in these reports not captured by the template?\n" +
      "3. Are the section names and descriptions accurate?\n\n" +
      'Return JSON: {"valid": true/false, "adjustments": [{"action": "add/remove/rename", ' +
      '"section": "name", "details": "explanation"}]}',
    user:
      `Candidate template sections:\n${sectionsJson}\n\n` +
      `Validate against these reports:\n\n${numbered}`,
  };
}

// ---------------------------------------------------------------------------
// Section generation
// ---------------------------------------------------------------------------

export function buildSectionGenerationPrompt(
  sectionName: string,
  sectionDescription: string,
  typicalLength: string,
  exemplarChunks: string[],
  clinicalNotes: string,
  questionnaireData: string | undefined,
): PromptPair {
  const exemplarText = exemplarChunks
    .map((chunk, i) => `--- EXAMPLE ${i + 1} ---\n${chunk}`)
    .join("\n\n");

  const userParts: string[] = [`CLINICAL NOTES:\n${clinicalNotes}`];
  if (questionnaireData) {
    userParts.push(`\nQUESTIONNAIRE DATA:\n${questionnaireData}`);
  }
  userParts.push(
    `\nEXEMPLAR EXAMPLES (for style and structure reference only):\n${exemplarText}`,
  );

  return {
    system:
      `You are an expert occupational therapist writing the "${sectionName}" section ` +
      `of a Functional Capacity Assessment (FCA) report for the Australian ` +
      `National Disability Insurance Scheme (NDIS).\n\n` +
      `The purpose of an FCA is to document how a participant's disability affects ` +
      `their daily functioning and to justify ongoing NDIS-funded supports. Every ` +
      `observation must be linked to its functional impact and support needs.\n\n` +
      `SECTION STRUCTURE AND PURPOSE:\n${sectionDescription}\n\n` +
      `Expected length: ${typicalLength}\n\n` +
      "WRITING STYLE — CRITICAL:\n" +
      "1. Write in third person, professional clinical tone with an advocacy focus.\n" +
      "2. Every observation MUST be linked to its functional impact: don't just state " +
      "'participant requires prompting for showering' — explain WHY (e.g., 'due to " +
      "reduced motivation, cognitive fatigue and lack of routine, showering is often " +
      "forgotten or deprioritised without external prompting').\n" +
      "3. Use NDIS advocacy language throughout: 'significantly impacts', 'without " +
      "support, [name] would be unable to...', 'this highlights the ongoing need " +
      "for...', 'reduced functional capacity rather than lack of skill'.\n" +
      "4. Write detailed, substantive paragraphs (3-5 sentences each). Do NOT use " +
      "brief bullet points where the exemplars use paragraphs.\n" +
      "5. Use proper markdown heading hierarchy: ## for subsections as specified in " +
      "the section structure above.\n" +
      "6. Match the DEPTH and clinical reasoning shown in the exemplar examples. " +
      "If an exemplar subsection has 3 paragraphs, write 3 paragraphs — not 1.\n" +
      "7. Where the participant has strengths (e.g., intact communication, physical " +
      "mobility), acknowledge them but explain that they do not offset the cumulative " +
      "functional impact of the disability.\n\n" +
      "CRITICAL RULES:\n" +
      "1. Only include findings supported by the provided clinical notes.\n" +
      "2. If the notes do not contain sufficient information for a specific finding, " +
      "write '[INSUFFICIENT DATA: description of what is missing]' rather than " +
      "inventing content.\n" +
      "3. Study the exemplar examples carefully — match their tone, depth, structure " +
      "and clinical language. These exemplars set the quality standard.\n" +
      "4. Do NOT copy patient-specific details from the exemplars — use them only " +
      "for style, structure and depth guidance.\n" +
      "5. Refer to the participant by name if provided in the clinical notes, " +
      "otherwise use 'the participant'.\n" +
      "9. Do NOT repeat clinical reasoning already established in earlier sections " +
      "of the report. Establish a clinical finding once and cross-reference it " +
      "rather than re-explaining the same disability mechanism in every paragraph.\n" +
      "6. Do NOT generate content for sections or subsections not described above.\n" +
      "7. Do NOT repeat the section title as the first line of the content.\n" +
      "8. Do NOT add numbered prefixes to subsection headings (write '## Emotional " +
      "Regulation' not '## 1. Emotional Regulation').",
    user: userParts.join("\n\n"),
  };
}

// ---------------------------------------------------------------------------
// Summary generation (Part E — needs full report context)
// ---------------------------------------------------------------------------

export function buildSummaryGenerationPrompt(
  sectionName: string,
  sectionDescription: string,
  typicalLength: string,
  exemplarChunks: string[],
  clinicalNotes: string,
  questionnaireData: string | undefined,
  reportSoFar: string,
): PromptPair {
  const exemplarText = exemplarChunks
    .map((chunk, i) => `--- EXAMPLE ${i + 1} ---\n${chunk}`)
    .join("\n\n");

  const userParts: string[] = [
    `REPORT SO FAR (Parts A-D):\n${reportSoFar}`,
    `\nCLINICAL NOTES:\n${clinicalNotes}`,
  ];
  if (questionnaireData) {
    userParts.push(`\nQUESTIONNAIRE DATA:\n${questionnaireData}`);
  }
  userParts.push(
    `\nEXEMPLAR EXAMPLES (for style and structure reference only):\n${exemplarText}`,
  );

  return {
    system:
      `You are an expert occupational therapist writing the "${sectionName}" section ` +
      `of a Functional Capacity Assessment (FCA) report for the Australian ` +
      `National Disability Insurance Scheme (NDIS).\n\n` +
      `You have access to the FULL REPORT generated so far (Parts A-D). ` +
      `Your task is to write the final summary and recommendations that ` +
      `directly reference the specific findings and assessment scores from ` +
      `the preceding sections. Do NOT repeat the full clinical reasoning — ` +
      `summarise and cross-reference.\n\n` +
      `SECTION STRUCTURE AND PURPOSE:\n${sectionDescription}\n\n` +
      `Expected length: ${typicalLength}\n\n` +
      "WRITING STYLE — CRITICAL:\n" +
      "1. Write in third person, professional clinical tone with an advocacy focus.\n" +
      "2. Reference specific findings from Parts A-D by name.\n" +
      "3. When assessment scores are available in Part D, cite them directly.\n" +
      "4. Use NDIS advocacy language.\n" +
      "5. Recommendations must be tied to specific findings, not generic.\n" +
      "6. Consolidate recommendations — fewer, well-justified items are stronger.\n\n" +
      "CRITICAL RULES:\n" +
      "1. Only include findings supported by the report and clinical notes.\n" +
      "2. Do NOT repeat the section title as the first line.\n" +
      "3. Do NOT add numbered prefixes to subsection headings.\n" +
      "4. Refer to the participant by name if used in the report.",
    user: userParts.join("\n\n"),
  };
}

// ---------------------------------------------------------------------------
// Coherence review
// ---------------------------------------------------------------------------

export function buildCoherencePrompt(fullReport: string): PromptPair {
  return {
    system:
      "You are a clinical document reviewer. Review this FCA report for internal " +
      "consistency across all sections.\n\n" +
      "Check for contradictions between sections, inconsistent terminology, " +
      "and recommendations that contradict findings.\n\n" +
      "If contradictions found, list them. Otherwise respond: " +
      "'No contradictions found. Report is internally consistent.'",
    user: `Review this FCA report for internal consistency:\n\n${fullReport}`,
  };
}

// ---------------------------------------------------------------------------
// Revision routing
// ---------------------------------------------------------------------------

export function buildRevisionRoutingPrompt(
  sectionNames: string[],
  userFeedback: string,
): PromptPair {
  const sectionsList = sectionNames.map((name) => `- ${name}`).join("\n");

  return {
    system:
      "You map user feedback to report sections. Given section names and " +
      "user feedback, identify which section(s) the feedback applies to.\n\n" +
      'Return JSON: {"sections": ["Section Name 1"]}\n\n' +
      "If unclear, return: " +
      '{"sections": [], "clarification_needed": "Ask the user..."}',
    user:
      `Report sections:\n${sectionsList}\n\n` +
      `User feedback: "${userFeedback}"\n\n` +
      "Which section(s) does this feedback apply to?",
  };
}

// ---------------------------------------------------------------------------
// Section revision
// ---------------------------------------------------------------------------

export function buildSectionRevisionPrompt(
  sectionName: string,
  sectionDescription: string,
  typicalLength: string,
  exemplarChunks: string[],
  clinicalNotes: string,
  questionnaireData: string | undefined,
  currentContent: string,
  userFeedback: string,
): PromptPair {
  const base = buildSectionGenerationPrompt(
    sectionName,
    sectionDescription,
    typicalLength,
    exemplarChunks,
    clinicalNotes,
    questionnaireData,
  );

  base.user +=
    `\n\nCURRENT CONTENT (to be revised):\n${currentContent}` +
    `\n\nREVISION REQUEST: ${userFeedback}` +
    "\n\nRewrite this section incorporating the revision request while maintaining " +
    "clinical accuracy and consistency with the clinical notes provided.";

  return base;
}
