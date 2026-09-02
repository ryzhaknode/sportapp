'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Check, Copy, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface MobileAccessCardProps {
  mobileUrl: string | null
}

export const MobileAccessCard = ({ mobileUrl }: MobileAccessCardProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!mobileUrl) return

    await navigator.clipboard.writeText(mobileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-amber-400" aria-hidden="true" />
          Мобільний доступ
        </CardTitle>
        <CardDescription>
          Відкрийте трекер на телефоні в тій самій Wi-Fi мережі
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mobileUrl ? (
          <>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCode
                value={mobileUrl}
                size={180}
                level="M"
                bgColor="#ffffff"
                fgColor="#0a0a0b"
              />
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-sm">
                {mobileUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? 'Скопійовано' : 'Копіювати URL'}
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>

            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Відскануйте QR-код камерою телефону</li>
              <li>Відкрийте посилання у Safari або Chrome</li>
              <li>
                Додайте на головний екран: «Поділитися» → «На екран «Домівка»» (iOS) або
                «Встановити застосунок» (Android)
              </li>
            </ol>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            URL не налаштовано. Запустіть{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">npm run mobile:url</code>{' '}
            на комп&apos;ютері, щоб згенерувати посилання для локальної мережі.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
