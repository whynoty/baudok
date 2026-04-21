import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from '../api/notifications'
import type { NotificationPreference } from '../api/types'

// Converts the base64url-encoded VAPID public key to a Uint8Array
// required by pushManager.subscribe()
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ['notificationPrefs'],
    queryFn: getNotificationPrefs,
  })
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: Partial<NotificationPreference>) =>
      updateNotificationPrefs(prefs),
    onSuccess: (updated) => {
      queryClient.setQueryData(['notificationPrefs'], updated)
    },
  })
}

interface UseNotificationSubscription {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function useNotificationSubscription(): UseNotificationSubscription {
  const isSupported =
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window

  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check existing subscription state on mount
  useEffect(() => {
    if (!isSupported) return

    let cancelled = false

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) {
          setIsSubscribed(sub !== null)
        }
      })
      .catch(() => {
        // Service worker may not be available in dev; silently ignore
      })

    return () => {
      cancelled = true
    }
  }, [isSupported])

  async function subscribe(): Promise<void> {
    if (!isSupported) return
    setIsLoading(true)
    try {
      const publicKey = await getVapidPublicKey()
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      await subscribePush(subscription.toJSON())
      setIsSubscribed(true)
    } finally {
      setIsLoading(false)
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!isSupported) return
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
      await unsubscribePush()
      setIsSubscribed(false)
    } finally {
      setIsLoading(false)
    }
  }

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe }
}
