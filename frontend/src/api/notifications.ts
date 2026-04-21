import apiClient from './client'
import type { NotificationPreference } from './types'

export async function getVapidPublicKey(): Promise<string> {
  const { data } = await apiClient.get<{ public_key: string }>(
    '/notifications/vapid-public-key/'
  )
  return data.public_key
}

export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  await apiClient.post('/notifications/subscribe/', subscription)
}

export async function unsubscribePush(): Promise<void> {
  await apiClient.delete('/notifications/subscribe/')
}

export async function getNotificationPrefs(): Promise<NotificationPreference> {
  const { data } = await apiClient.get<NotificationPreference>(
    '/notifications/preferences/'
  )
  return data
}

export async function updateNotificationPrefs(
  prefs: Partial<NotificationPreference>
): Promise<NotificationPreference> {
  const { data } = await apiClient.patch<NotificationPreference>(
    '/notifications/preferences/',
    prefs
  )
  return data
}
