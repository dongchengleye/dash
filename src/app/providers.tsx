'use client'

import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider } from '@/contexts/theme-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NextUIProvider>
        <div className="h-dvh w-full">{children}</div>
      </NextUIProvider>
    </ThemeProvider>
  )
}
