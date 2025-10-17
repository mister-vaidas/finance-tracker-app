'use client'
import { useEffect, useState } from 'react'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted'|'dismissed' }> }

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BIP | null>(null)
  const [installed, setInstalled] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BIP)
      setSupported(true)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  if (!supported && !deferredPrompt) {
    // Show nothing if the browser says not installable (will flip on when criteria met)
    return null
  }

  const click = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    // choice result handled by appinstalled or simply keep state
  }

  return (
    <button className="btn" onClick={click} aria-label="Install app">
      Install app
    </button>
  )
}
