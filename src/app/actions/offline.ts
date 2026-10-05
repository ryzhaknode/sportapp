'use server'

import { revalidatePath } from 'next/cache'
import { buildProgramSnapshot } from '@/lib/db/offline-snapshot'
import { importOfflineSession } from '@/lib/db/import-offline-session'
import type { ProgramSnapshot, SyncResult, SyncSessionPayload } from '@/lib/offline/types'

export const actionGetProgramSnapshot = async (): Promise<ProgramSnapshot> =>
  buildProgramSnapshot()

export const actionSyncLocalSession = async (
  payload: SyncSessionPayload,
): Promise<SyncResult> => {
  const result = await importOfflineSession(payload)
  if (result.ok) {
    revalidatePath('/')
    revalidatePath('/history')
    revalidatePath('/weight')
    revalidatePath('/program')
  }
  return result
}
