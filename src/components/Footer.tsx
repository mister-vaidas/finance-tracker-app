'use client'
export default function Footer({ version }: { version: string }) {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-10 mb-6 text-center text-xs text-soft">
      <div>© {year} Personal Finance Tracker</div>
      <div className="mt-1">v{version}</div>
    </footer>
  )
}
