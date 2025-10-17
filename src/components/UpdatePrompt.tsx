'use client'
import { useEffect, useState } from 'react'

export default function UpdatePrompt(){
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let reg: ServiceWorkerRegistration | null | undefined = null

    const check = async () => {
      try {
        reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return

        // if an update is already waiting
        if (reg.waiting) {
          setWaiting(reg.waiting)
          setVisible(true)
        }

        // when a new SW is found
        reg.addEventListener('updatefound', () => {
          const sw = reg!.installing
          if (!sw) return
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && reg!.waiting) {
              setWaiting(reg!.waiting)
              setVisible(true)
            }
          })
        })
      } catch {/* ignore */}
    }

    // reload when controller changes (new SW activated)
    const onControllerChange = () => window.location.reload()

    if ('serviceWorker' in navigator) {
      check()
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    }
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const doUpdate = () => {
    if (!waiting) return
    waiting.postMessage({ type: 'SKIP_WAITING' }) // Workbox/next-pwa listens for this
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 px-4">
      <div className="mx-auto max-w-md sm:max-w-2xl bg-card border border-white/10 rounded-xl p-3 shadow-soft flex items-center justify-between">
        <div className="text-sm">A new version is available.</div>
        <div className="flex gap-2">
          <button className="badge" onClick={()=>setVisible(false)}>Later</button>
          <button className="btn" onClick={doUpdate}>Update now</button>
        </div>
      </div>
    </div>
  )
}
