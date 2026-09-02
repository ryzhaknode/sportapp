'use client'

import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  className?: string
}

export const AnimatedNumber = ({ value, className }: AnimatedNumberProps) => {
  const spring = useSpring(value, { stiffness: 120, damping: 20 })
  const display = useTransform(spring, (v) => Math.round(v).toString())

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span className={className}>{display}</motion.span>
}
