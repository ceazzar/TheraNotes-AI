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
