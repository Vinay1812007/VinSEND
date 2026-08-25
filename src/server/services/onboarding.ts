import { publicId } from '@/lib/ids'
import { createOrganization, createProject } from '@/server/repositories/orgs'

const SLUG_STOPWORDS = new Set(['admin', 'app', 'api', 'auth', 'settings', 'sign-in', 'sign-up'])

export function slugifyOrgName(name: string, salt: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
  const seed = base || 'workspace'
  return `${SLUG_STOPWORDS.has(seed) ? `${seed}-x` : seed}-${salt.slice(0, 6)}`
}

/**
 * First-run onboarding. Creates an org with the caller as owner and a
 * default "Production" project. Idempotent by (owner_id, name) — a second
 * call with the same name simply creates a new slug.
 */
export async function bootstrapWorkspace(input: {
  userId: string
  orgName: string
  projectName?: string
}) {
  const slug = slugifyOrgName(input.orgName, input.userId.replace(/-/g, ''))
  const org = await createOrganization({
    name: input.orgName,
    slug,
    ownerId: input.userId,
  })
  const project = await createProject({
    orgId: org.id,
    name: input.projectName ?? 'Production',
    publicId: publicId('project'),
  })
  return { org, project }
}
