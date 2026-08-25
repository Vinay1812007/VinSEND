import { redirect } from 'next/navigation'
import { requireCurrentUser } from '@/lib/auth/server'
import { findFirstProject } from '@/server/services/current-context'
import { OnboardingForm } from './form'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireCurrentUser()
  const first = await findFirstProject()
  if (first) {
    redirect(`/app/${first.org.slug}/${first.project.public_id}/overview`)
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        Onboarding · Step 1 of 1
      </div>
      <h1 className="font-display text-3xl font-medium tracking-tight text-[color:var(--ink)]">
        Name your workspace.
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        We&rsquo;ll create a workspace and a default project. You can add more later.
      </p>
      <div className="mt-8">
        <OnboardingForm defaultName={user.email?.split('@')[1]?.split('.')[0] ?? 'Workspace'} />
      </div>
    </div>
  )
}
