import { redirect } from 'next/navigation'
import { findFirstProject } from '@/server/services/current-context'

export const dynamic = 'force-dynamic'

export default async function AppIndex() {
  const ctx = await findFirstProject()
  if (!ctx) redirect('/onboarding')
  redirect(`/app/${ctx.org.slug}/${ctx.project.public_id}/overview`)
}
