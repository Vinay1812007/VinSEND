'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff, retryWebhookDelivery, suspendOrganization } from '@/server/services/admin'

export async function retryDeliveryAction(input: { deliveryId: string }) {
  const staff = await requireStaff()
  await retryWebhookDelivery({ deliveryId: input.deliveryId, actorUserId: staff.id })
  revalidatePath('/admin/webhooks')
  return { ok: true }
}

export async function suspendOrgAction(input: { orgId: string }) {
  const staff = await requireStaff()
  await suspendOrganization({ orgId: input.orgId, actorUserId: staff.id })
  revalidatePath(`/admin/organizations/${input.orgId}`)
  return { ok: true }
}
