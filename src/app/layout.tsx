import './globals.css'
import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import pkg from '../../package.json' assert { type: 'json' }
import UpdatePrompt from '@/components/UpdatePrompt'

export const metadata: Metadata = {
  title: 'Personal Finance Tracker',
  description: 'Private, offline-first finance tracking (no logins)',
  manifest: '/manifest.json?v=2',
  themeColor: '#0EA5E9',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto max-w-md sm:max-w-2xl px-4 pb-24 pt-6">
          <UpdatePrompt />
          {children}
          <Footer version={pkg.version} />
        </div>
      </body>
    </html>
  )
}
