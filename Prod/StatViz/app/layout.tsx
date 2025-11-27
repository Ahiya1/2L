import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Toaster } from 'sonner'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-rubik',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StatViz - פלטפורמת דוחות סטטיסטיים',
  description: 'פלטפורמה מאובטחת לצפייה בדוחות ניתוח סטטיסטיים',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-left"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: { direction: 'rtl' }
          }}
        />
      </body>
    </html>
  )
}
