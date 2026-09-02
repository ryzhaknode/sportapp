'use server'

import { revalidatePath } from 'next/cache'
import { markSkipped, unmarkSkipped } from '@/lib/db/skipped-days'

export const markDaySkippedAction = async (date: string) => {
  await markSkipped(date)
  revalidatePath('/')
  revalidatePath('/history')
}

export const unmarkDaySkippedAction = async (date: string) => {
  await unmarkSkipped(date)
  revalidatePath('/')
  revalidatePath('/history')
}
