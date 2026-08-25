import { verifyUnsubscribeToken } from '@/lib/security/unsubscribe'
import { addSuppressionFromUnsubscribe } from '@/server/services/suppressions'
import { getServiceRoleClient } from '@/lib/db/service'
import { Brand } from '@/components/layout/brand'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ConfirmForm } from './confirm-form'

export const dynamic = 'force-dynamic'

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return <Layout><Alert tone="bad">This unsubscribe link is invalid or expired.</Alert></Layout>

  // Show a confirm page. Actual write happens on the form POST.
  return (
    <Layout>
      <p className="text-sm text-[color:var(--muted)]">
        We&rsquo;ll stop sending mail to{' '}
        <b className="font-mono text-[color:var(--ink)]">{payload.email}</b>.
      </p>
      <div className="mt-4">
        <ConfirmForm token={token} email={payload.email} />
      </div>
    </Layout>
  )
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
              Unsubscribe
            </h1>
            {children}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
