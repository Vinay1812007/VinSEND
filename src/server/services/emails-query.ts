import { findEmailByPublicId, listEmailsByProject } from '@/server/repositories/emails'

export async function getEmail(projectId: string, publicId: string) {
  return findEmailByPublicId(projectId, publicId)
}

export async function listEmails(projectId: string, opts: { limit?: number; before?: string } = {}) {
  return listEmailsByProject(projectId, opts)
}

