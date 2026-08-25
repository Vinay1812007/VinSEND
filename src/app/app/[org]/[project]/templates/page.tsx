import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { loadDashboardContext } from '@/server/services/current-context'
import { listTemplatesByProject } from '@/server/services/templates'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const rows = await listTemplatesByProject(ctx.project.id)
  const base = `/app/${ctx.org.slug}/${ctx.project.public_id}`

  return (
    <>
      <PageHeader
        eyebrow="Templates"
        title="Reusable messages"
        description="Mustache-style {{variable}} interpolation. Variables are extracted automatically."
        action={
          <Link href={`${base}/templates/new`}>
            <Button>New template</Button>
          </Link>
        }
      />
      <Card>
        <CardHeader title={`${rows.length} template${rows.length === 1 ? '' : 's'}`} eyebrow="Current" />
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No templates yet"
              description="Create one to reuse HTML across many sends."
              action={
                <Link href={`${base}/templates/new`}>
                  <Button size="sm">New template</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'subject', label: 'Subject' },
              { key: 'vars', label: 'Variables' },
              { key: 'v', label: 'Version', align: 'right' },
            ]}
          >
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`${base}/templates/${t.public_id}`} className="hover:underline text-[color:var(--accent)]">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell mono>{t.variables.length ? t.variables.join(', ') : '—'}</TableCell>
                <TableCell mono align="right">
                  {t.version}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  )
}
