import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const cairo = Cairo({
  subsets: ['latin', 'arabic'],
  variable: '--font-cairo',
})

export const metadata: Metadata = {
  title: 'نظام سندات القبض والصرف',
  description: 'نظام إدارة سندات القبض والصرف للشركات والمؤسسات',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
