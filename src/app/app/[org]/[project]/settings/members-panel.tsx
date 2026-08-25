'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Tag } from '@/components/ui/tag'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Alert } from '@/components/ui/alert'
import {
  changeMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from './member-actions'

interface Member {
  user_id: string
  role: 'owner' | 'admin' | 'member'
  display_name: string | null
  email: string | null
}

export function MembersPanel({
  orgSlug,
  projectPublicId,
  members,
  currentUserRole,
  currentUserId,
}: {
  orgSlug: string
  projectPublicId: string
  members: Member[]
  currentUserRole: 'owner' | 'admin' | 'member'
  currentUserId: string
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="bad">{error}</Alert>}
      <DataTable
        columns={[
          { key: 'who', label: 'Member' },
          { key: 'role', label: 'Role' },
          { key: 'actions', label: '', align: 'right' },
        ]}
      >
        {members.map((m) => (
          <TableRow key={m.user_id}>
            <TableCell>
              <div className="font-medium">{m.display_name ?? '—'}</div>
              <div className="font-mono text-xs text-[color:var(--muted)]">{m.email ?? m.user_id.slice(0, 12) + '…'}</div>
            </TableCell>
            <TableCell>
              <Tag tone={m.role === 'owner' ? 'accent' : m.role === 'admin' ? 'good' : 'neutral'}>
                {m.role}
              </Tag>
            </TableCell>
            <TableCell align="right">
              {canManage && m.user_id !== currentUserId && m.role !== 'owner' && (
                <div className="inline-flex items-center gap-2">
                  <select
                    className="rounded border border-[color:var(--rule)] bg-[color:var(--ground)] px-2 py-1 text-xs"
                    defaultValue={m.role}
                    onChange={(e) => {
                      const newRole = e.target.value as 'admin' | 'member'
                      start(async () => {
                        const res = await changeMemberRoleAction({
                          orgSlug,
                          projectPublicId,
                          targetUserId: m.user_id,
                          newRole,
                        })
                        if ('error' in res) setError(res.error!)
                      })
                    }}
                    disabled={pending}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!confirm(`Transfer ownership to ${m.email ?? m.user_id}?`)) return
                        start(async () => {
                          const res = await transferOwnershipAction({
                            orgSlug,
                            projectPublicId,
                            newOwnerUserId: m.user_id,
                          })
                          if ('error' in res) setError(res.error!)
                        })
                      }}
                    >
                      Make owner
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm(`Remove ${m.email ?? m.user_id} from this workspace?`)) return
                      start(async () => {
                        const res = await removeMemberAction({
                          orgSlug,
                          projectPublicId,
                          targetUserId: m.user_id,
                        })
                        if ('error' in res) setError(res.error!)
                      })
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </div>
  )
}
