// Minimal {{var}} interpolation. No conditionals, no loops (spec §23).
// Unknown variables render as an empty string; missing template variables
// throw at validate() time so the caller sees the problem.

const VAR_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

export function renderTemplate(source: string, variables: Record<string, string>): string {
  return source.replace(VAR_RE, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name] ?? '') : '',
  )
}

export function extractTemplateVariables(source: string): string[] {
  const out = new Set<string>()
  for (const m of source.matchAll(VAR_RE)) {
    out.add(m[1]!)
  }
  return Array.from(out).sort()
}

export function validateTemplateVariables(
  source: string,
  supplied: Record<string, string>,
): { ok: true } | { ok: false; missing: string[] } {
  const required = extractTemplateVariables(source)
  const missing = required.filter((v) => !(v in supplied))
  return missing.length === 0 ? { ok: true } : { ok: false, missing }
}
