'use server'

import { revalidatePath } from 'next/cache'
import { addBodyWeightEntry } from '@/lib/db/body-weight'

export const actionAddBodyWeight = async (input: { date: string; weightKg: number }) => {
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > 300) {
    throw new Error('INVALID_BODY_WEIGHT')
  }
  await addBodyWeightEntry(input)
  revalidatePath('/weight')
}
