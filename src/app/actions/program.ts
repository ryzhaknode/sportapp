'use server'

import { revalidatePath } from 'next/cache'
import { updateExerciseSlot } from '@/lib/db/program'

export const updateSlotAction = async (
  slotId: number,
  patch: {
    sets: number
    repMin: number
    repMax: number
    rirMin: number
    rirMax: number
    restSec: number
    startWeight: number | null
    increment: number
  },
) => {
  await updateExerciseSlot(slotId, patch)
  revalidatePath('/program')
  revalidatePath('/')
}
