import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { listApiKeys } from '@/server/services/api-keys'
import { CreateKeyDialog } from './create-key-dialog'
import { RevokeButton } from './revoke-button'

export const dynamic = 'force-dynamic'

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const keys = await listApiKeys(ctx.project.id)

  return (
    <>
      <PageHeader
        eyebrow="API Keys"
        title="Keys"
        description="Bearer tokens for the /v1 API. The secret is shown once at creation."
        action={<CreateKeyDialog orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />}
      />
      <Card>
        <CardHeader title={`${keys.length} key${keys.length === 1 ? '' : 's'}`} eyebrow="Current" />
        {keys.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No API keys yet"
              description="Create one to authenticate against POST /v1/emails."
            />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'prefix', label: 'Prefix' },
              { key: 'env', label: 'Env' },
              { key: 'last', label: 'Last used' },
              { key: 'created', label: 'Created' },
              { key: 'actions', label: '', align: 'right' },
            ]}
          >
            {keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell>{k.name}</TableCell>
                <TableCell mono>{k.prefix}</TableCell>
                <TableCell>
                  <Tag tone={k.environment === 'live' ? 'accent' : 'neutral'}>{k.environment}</Tag>
                </TableCell>
                <TableCell mono>
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell mono>{new Date(k.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  {k.revoked_at ? (
                    <Tag tone="bad">revoked</Tag>
                  ) : (
                    <RevokeButton
                      orgSlug={ctx.org.slug}
                      projectPublicId={ctx.project.public_id}
                      keyPublicId={k.public_id}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
