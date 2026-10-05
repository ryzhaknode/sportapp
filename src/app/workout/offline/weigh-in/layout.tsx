import type { ReactNode } from 'react'
import { Suspense } from 'react'

export default function OfflineWeighInLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-8 text-center text-sm text-muted-foreground">Завантаження…</main>
      }
    >
      {children}
    </Suspense>
  )
}
