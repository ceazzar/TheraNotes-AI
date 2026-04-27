@AGENTS.md

## UI Rules

- ALWAYS use shadcn/ui components from `@/components/ui/`. Never use raw HTML elements when a shadcn equivalent exists.
- Required mappings: `<button>` → `Button`, `<input>` → `Input`, `<textarea>` → `Textarea`, `<label>` → `Label`, `<select>` → `Select`, `<dialog>` → `Dialog`, `<progress>` → `Progress`
- Use `cn()` from `@/lib/utils` for conditional class names. Never inline complex ternaries in className strings.
- Follow existing component patterns in `components/ui/` before creating custom elements.
- All cards/containers must use `Card` + `CardContent` from shadcn.
- All status indicators must use `Badge` from shadcn.
- All form layouts must use `Label` + the appropriate shadcn input component.

## Test Credentials

- **Email:** test@user.com
- **Password:** test123

## Generation Logging

All LLM calls are logged to the `generation_logs` table via `lib/ai/log.ts`. Every generation, revision, coherence check, and inline refinement captures: full prompts, RAG chunks retrieved, model config, token usage, latency, and raw/processed output. Logging is fire-and-forget — it never breaks the user-facing flow on failure. When debugging a bad section output, query `generation_logs` filtered by `report_id` and `section_id`.

## Database Migrations

Migrations must be numbered sequentially: `001_initial_schema.sql` through `006_generation_logs.sql`. Always apply new migrations to the Supabase project before deploying code that depends on them.
