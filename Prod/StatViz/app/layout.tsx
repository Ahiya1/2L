import type { Metadata } from 'next'
import './globals.css'
import '@/lib/env' // Validate environment on startup

export const metadata: Metadata = {
  title: 'StatViz - Statistical Reports Platform',
  description: 'Secure platform for viewing statistical analysis reports',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
