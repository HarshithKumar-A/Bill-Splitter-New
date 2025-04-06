import { ThemeProvider } from '@/contexts/ThemeContext'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bill Splitter App',
  description: 'Split expenses with friends easily',
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
          <main className="min-h-screen bg-gray-100">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
