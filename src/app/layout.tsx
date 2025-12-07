import { ThemeProvider } from '@/contexts/ThemeContext'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import PwaInstallModal from '@/components/PwaInstallModal'
import { OfflineProvider } from '@/modules/offline/OfflineContext'
import OfflineIndicator from '@/modules/offline/OfflineIndicator'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bill Splitter App',
  description: 'Split expenses with friends easily',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <OfflineProvider>
            <main className="min-h-screen bg-gray-100">
              <OfflineIndicator />
              {children}
              <PwaInstallModal />
            </main>
          </OfflineProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
