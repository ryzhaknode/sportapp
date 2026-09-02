'use client'

import { motion } from 'framer-motion'
import { CYCLE_STEPS } from '@/lib/program-guide'

export const GuideCycleVisual = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-1">
      {CYCLE_STEPS.map((step, index) => (
        <motion.div
          key={step.key}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
          className="flex flex-1 flex-col items-center gap-2"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${step.color} ${
              step.label === '·' ? 'h-2 w-2 text-transparent' : ''
            }`}
          >
            {step.label !== '·' ? step.label : ''}
          </div>
          {step.label !== '·' && (
            <span className="text-[10px] text-muted-foreground">
              {step.label === 'A' ? 'стимул' : step.label === 'B' ? 'обсяг' : 'легке'}
            </span>
          )}
        </motion.div>
      ))}
    </div>
    <p className="text-center text-xs text-muted-foreground">
      A → Rest → B → Rest → C → Rest → повтор
    </p>
  </div>
)
