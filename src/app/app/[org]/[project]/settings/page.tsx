import { PageHeader } from '@/components/layout/dashboard-shell'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { loadDashboardContext } from '@/server/services/current-context'
import { listInvitationsByOrg } from '@/server/services/invitations'
import { listMembers } from '@/server/services/members'
import { InviteForm } from './invite-form'
import { RevokeInviteButton } from './revoke-invite-button'
import { MembersPanel } from './members-panel'
import { Card as MembersCard, CardHeader as MembersCardHeader } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ org: string; project: string }>
}) {
  const { org, project } = await params
  const ctx = await loadDashboardContext(org, project)
  const invitations = ctx.role !== 'member' ? await listInvitationsByOrg(ctx.org.id) : []
  const members = await listMembers(ctx.org.id)

  return (
    <>
      <PageHeader eyebrow="Settings" title="Workspace" description="Workspace info and team access." />
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader title="Workspace" eyebrow="Organization" />
          <CardBody>
            <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Name</dt>
              <dd>{ctx.org.name}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Slug</dt>
              <dd className="font-mono">{ctx.org.slug}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Your role</dt>
              <dd>{ctx.role}</dd>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Project" eyebrow="Current" />
          <CardBody>
            <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Name</dt>
              <dd>{ctx.project.name}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Public ID</dt>
              <dd className="font-mono text-[12.5px]">{ctx.project.public_id}</dd>
              <dt className="font-mono text-[11px] text-[color:var(--muted)]">Created</dt>
              <dd className="font-mono text-[12.5px]">
                {new Date(ctx.project.created_at).toLocaleString()}
              </dd>
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mb-6">
        <MembersCard>
          <MembersCardHeader
            title="Members"
            eyebrow={`${members.length} member${members.length === 1 ? '' : 's'}`}
          />
          <div className="p-6">
            <MembersPanel
              orgSlug={ctx.org.slug}
              projectPublicId={ctx.project.public_id}
              members={members}
              currentUserRole={ctx.role}
              currentUserId={ctx.user.id}
            />
          </div>
        </MembersCard>
      </div>

      {ctx.role !== 'member' && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader
                title="Pending invitations"
                eyebrow={`${invitations.filter((i) => i.status === 'pending').length} pending`}
              />
              {invitations.length === 0 ? (
                <CardBody>
                  <p className="text-sm text-[color:var(--muted)]">No invitations yet.</p>
                </CardBody>
              ) : (
                <DataTable
                  columns={[
                    { key: 'email', label: 'Email' },
                    { key: 'role', label: 'Role' },
                    { key: 'status', label: 'Status' },
                    { key: 'when', label: 'Invited' },
                    { key: 'actions', label: '', align: 'right' },
                  ]}
                >
                  {invitations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell mono>{i.email}</TableCell>
                      <TableCell>
                        <Tag tone={i.role === 'admin' ? 'accent' : 'neutral'}>{i.role}</Tag>
                      </TableCell>
                      <TableCell>
                        <Tag
                          tone={
                            i.status === 'accepted'
                              ? 'good'
                              : i.status === 'pending'
                                ? 'warn'
                                : 'bad'
                          }
                        >
                          {i.status}
                        </Tag>
                      </TableCell>
                      <TableCell mono>{new Date(i.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        {i.status === 'pending' && (
                          <RevokeInviteButton
                            orgSlug={ctx.org.slug}
                            projectPublicId={ctx.project.public_id}
                            invitationId={i.id}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </DataTable>
              )}
            </Card>
          </div>
          <Card>
            <CardHeader title="Invite teammate" eyebrow="Send" />
            <CardBody>
              <InviteForm orgSlug={ctx.org.slug} projectPublicId={ctx.project.public_id} />
            </CardBody>
          </Card>
        </div>
      )}
    </>
  )
}
