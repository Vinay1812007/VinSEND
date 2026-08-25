'use server'

import { verifyUnsubscribeToken } from '@/lib/security/unsubscribe'
import { addSuppressionFromUnsubscribe } from '@/server/services/suppressions'
import { getServiceRoleClient } from '@/lib/db/service'

export async function confirmUnsubscribeAction(input: { token: string }) {
  const payload = verifyUnsubscribeToken(input.token)
  if (!payload) return { error: 'Invalid or expired link.' }
  const sb = getServiceRoleClient()
  const { data: project } = await sb
    .from('projects')
    .select('org_id')
    .eq('id', payload.projectId)
    .maybeSingle()
  if (!project) return { error: 'Project not found.' }
  await addSuppressionFromUnsubscribe({
    projectId: payload.projectId,
    orgId: (project as { org_id: string }).org_id,
    email: payload.email,
  })
  return { ok: true }
}
