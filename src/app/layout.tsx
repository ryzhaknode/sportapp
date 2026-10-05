import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Nav } from '@/components/layout/nav'
import { OfflineShell } from '@/components/offline/offline-shell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Gym ABC Tracker',
  description: 'Трекер гіпертрофії A/B/C — прогресія ваги та повторів',
  appleWebApp: {
    capable: true,
    title: 'Gym ABC',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-background antialiased">
        <div className="mx-auto min-h-full max-w-lg pb-24">
          <OfflineShell>{children}</OfflineShell>
        </div>
        <Nav />
      </body>
    </html>
  )
}
