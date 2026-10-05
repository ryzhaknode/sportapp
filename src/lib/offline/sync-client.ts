'use client'

import { actionSyncLocalSession } from '@/app/actions/offline'
import {
  getLocalWorkout,
  markLocalSynced,
  setLocalSyncError,
  toSyncPayload,
} from '@/lib/offline/local-session'
import type { SyncResult } from '@/lib/offline/types'

export const syncLocalSessionById = async (localId: string): Promise<SyncResult> => {
  const record = await getLocalWorkout(localId)
  if (!record) {
    return { ok: false, code: 'INVALID', message: 'Локальне тренування не знайдено' }
  }
  if (record.status !== 'completed') {
    return { ok: false, code: 'NOT_FINISHED', message: 'Спочатку заверши тренування' }
  }

  const payload = toSyncPayload(record)
  const result = await actionSyncLocalSession(payload)

  if (result.ok) {
    await markLocalSynced(localId, result.serverSessionId)
  } else {
    await setLocalSyncError(localId, result.message)
  }

  return result
}
