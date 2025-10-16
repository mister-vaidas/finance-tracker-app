import './globals.css'
import type { Metadata } from 'next'


export const metadata: Metadata = {
title: 'Personal Finance Tracker',
description: 'Private, offline-first finance tracking (no logins)'
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body className="min-h-screen">
<div className="mx-auto max-w-md sm:max-w-2xl px-4 pb-20 pt-6">{children}</div>
</body>
</html>
)
}