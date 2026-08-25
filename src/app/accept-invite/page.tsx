import { redirect } from 'next/navigation'
import { requireCurrentUser } from '@/lib/auth/server'
import { acceptInvitationByToken } from '@/server/services/invitations'
import { Brand } from '@/components/layout/brand'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export const dynamic = 'force-dynamic'

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) {
    return (
      <Layout>
        <Alert tone="bad">Missing invite token.</Alert>
      </Layout>
    )
  }

  const user = await requireCurrentUser().catch(() => null)
  if (!user) {
    // Not signed in — bounce to sign-in preserving the accept URL as ?next.
    const next = `/accept-invite?token=${encodeURIComponent(token)}`
    redirect(`/sign-in?next=${encodeURIComponent(next)}`)
  }

  const result = await acceptInvitationByToken({
    token,
    userId: user.id,
    userEmail: user.email ?? '',
  })
  if ('error' in result) {
    return (
      <Layout>
        <Alert tone="bad">{result.error}</Alert>
      </Layout>
    )
  }
  redirect(`/app/${result.orgSlug}`)
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand size="lg" />
        </div>
        <Card>
          <CardBody className="p-8">
            <h1 className="mb-4 font-display text-xl font-medium text-[color:var(--ink)]">
              Accept invitation
            </h1>
            {children}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
