import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TRPCProvider } from '@/components/providers/TRPCProvider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShipLog - Product Launch Tracker',
  description: 'Track your indie hacker product launches',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  )
}
