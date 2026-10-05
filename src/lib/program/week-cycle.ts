import type { ExerciseSlot, SessionMode } from '@/lib/db/schema'
import type { WeekContext } from '@/lib/program/types'
import { CYCLE_LENGTH_WEEKS } from '@/lib/program/seed'

export const DELOAD_WEEKS = [7, 13] as const
export const EXTRA_SET_WEEKS = [8, 9, 10, 11, 12] as const

export const getWeekContext = (
  weekNumber: number,
  tournamentWeekEnabled: boolean,
): WeekContext => {
  if (tournamentWeekEnabled) {
    return {
      weekNumber,
      mode: 'tournament',
      extraSetPhase: false,
    }
  }

  if (weekNumber === 13) {
    return {
      weekNumber,
      mode: 'test',
      extraSetPhase: false,
    }
  }

  if (DELOAD_WEEKS.includes(weekNumber as (typeof DELOAD_WEEKS)[number])) {
    return {
      weekNumber,
      mode: 'deload',
      extraSetPhase: false,
    }
  }

  const extraSetPhase = (EXTRA_SET_WEEKS as readonly number[]).includes(weekNumber)

  return {
    weekNumber,
    mode: 'normal',
    extraSetPhase,
  }
}

export const getEffectiveSlotParams = (
  slot: ExerciseSlot,
  context: WeekContext,
): {
  sets: number
  repMin: number
  repMax: number
  rirMin: number
  rirMax: number
  restSec: number
} => {
  let sets = slot.sets
  let rirMin = slot.rirMin
  let rirMax = slot.rirMax

  if (context.mode === 'deload' || context.mode === 'test') {
    sets = Math.max(1, Math.ceil(slot.sets / 2))
    rirMin = 3
    rirMax = 4
  }

  if (context.mode === 'test') {
    sets = 1
    rirMin = 0
    rirMax = 1
  }

  if (context.mode === 'tournament') {
    sets = 2
    rirMin = 2
    rirMax = 3
  }

  if (context.extraSetPhase && slot.extraSetInPhase && context.mode === 'normal') {
    sets += 1
  }

  return {
    sets,
    repMin: slot.repMin,
    repMax: slot.repMax,
    rirMin,
    rirMax,
    restSec: slot.restSec,
  }
}

export const getModeLabel = (mode: SessionMode): string => {
  switch (mode) {
    case 'deload':
      return 'Розвантаження'
    case 'tournament':
      return 'Турнірний'
    case 'test':
      return 'Тест / розвантаження'
    default:
      return 'Звичайний'
  }
}

export { CYCLE_LENGTH_WEEKS }
