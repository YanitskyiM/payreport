'use client'

import { useEffect, useState } from 'react'

function detectStandaloneMode() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  )
}

export function useStandaloneMode() {
  const [isStandalone, setIsStandalone] = useState(detectStandaloneMode)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const updateStandaloneMode = () => {
      setIsStandalone(detectStandaloneMode())
    }

    updateStandaloneMode()
    mediaQuery.addEventListener('change', updateStandaloneMode)

    return () => {
      mediaQuery.removeEventListener('change', updateStandaloneMode)
    }
  }, [])

  return isStandalone
}
