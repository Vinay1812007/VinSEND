'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/card'
import { DataTable, TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { restoreTemplateVersionAction } from '../actions'

interface Version {
  version: number
  name: string
  subject: string
  created_at: string
}

export function VersionList({
  orgSlug,
  projectPublicId,
  publicId,
  versions,
}: {
  orgSlug: string
  projectPublicId: string
  publicId: string
  versions: Version[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Card>
      <CardHeader title="Version history" eyebrow={`${versions.length} snapshot${versions.length === 1 ? '' : 's'}`} />
      <DataTable
        columns={[
          { key: 'v', label: 'Version', align: 'right' },
          { key: 'name', label: 'Name' },
          { key: 'subject', label: 'Subject' },
          { key: 'when', label: 'Saved' },
          { key: 'actions', label: '', align: 'right' },
        ]}
      >
        {versions.map((v) => (
          <TableRow key={v.version}>
            <TableCell mono align="right">v{v.version}</TableCell>
            <TableCell>{v.name}</TableCell>
            <TableCell>{v.subject}</TableCell>
            <TableCell mono>{new Date(v.created_at).toLocaleString()}</TableCell>
            <TableCell align="right">
              <Button
                variant="ghost"
                size="sm"
                loading={pending}
                onClick={() => {
                  if (!confirm(`Restore version ${v.version}? The current version is saved to history first.`)) return
                  start(async () => {
                    await restoreTemplateVersionAction({
                      orgSlug,
                      projectPublicId,
                      publicId,
                      version: v.version,
                    })
                    router.refresh()
                  })
                }}
              >
                Restore
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </Card>
  )
}
