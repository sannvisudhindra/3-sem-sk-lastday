# Agent Rules — Encore

## Scope
- You are Agent P<N>. Only create/edit files under the paths you own (see WORK_DISTRIBUTION.md §2).
- Never edit: package.json/package-lock.json of a package you don't own, PRD.md, WORK_DISTRIBUTION.md,
  another agent's folders. If you need a change there, STOP and write the request in your final message.
- Never run `npm install <pkg>` in a package you don't own. All dependencies are pre-declared at scaffold.

## Contract
- The API contract (PRD §7) and DB schema (PRD §5) are the source of truth. Match field names exactly
  (camelCase in JSON, snake_case in SQL). Do not invent endpoints.
- Errors use: { error: { code, message, details } } with codes from PRD §7.2.
- Money is integer paise. Times are ISO-8601 UTC strings; display in IST.
- Timers derive from server `expiresAt`, never client-only.

## Security
- Never put SUPABASE_SERVICE_ROLE_KEY or SMTP creds in client code or git. Use .env (gitignored) and .env.example.
- The browser never writes to Supabase tables. Writes go through the Express API.
- Scope every query by the authenticated user (user_id / organiser_id). Return 404 for others' data.

## Code style
- Client: TypeScript, function components, Tailwind classes, tokens from ui/tokens.css, motion from "motion/react".
- Server: Node 20 ESM JavaScript, zod validation per route, async handlers wrapped, no business logic in routes
  that belongs in SQL functions (create_hold, confirm_booking, create_event, sweep_expired, queue_*).
- Small files, clear names, no dead code, no TODOs left in merged code.

## Workflow
- Commit often with prefix: "p<N>(<area>): message". Pull/rebase main before every push.
- Before pushing: client → `npm run build` passes; server → `npm test` passes.
- When done with a task, update nothing outside your paths; report what you built and any contract questions.
