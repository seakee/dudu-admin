import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationItem {
  id: string
  message: string
  type: NotificationType
  duration: number
  count: number
  createdAt: number
}

interface NotificationTimer {
  timeoutId: ReturnType<typeof setTimeout> | null
  remaining: number
  startedAt: number
}

const MAX_NOTIFICATIONS = 5
const DEFAULT_DURATION_MS = 3200
let nextNotificationId = 0

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationItem[]>([])
  const paused = ref(false)
  const timers = new Map<string, NotificationTimer>()

  function clearTimer(id: string) {
    const entry = timers.get(id)
    if (entry?.timeoutId) {
      clearTimeout(entry.timeoutId)
    }
    timers.delete(id)
  }

  function removeNotification(id: string) {
    clearTimer(id)
    notifications.value = notifications.value.filter((item) => item.id !== id)
  }

  function scheduleTimer(id: string, duration: number) {
    clearTimer(id)
    if (duration <= 0) return

    const timer: NotificationTimer = {
      timeoutId: null,
      remaining: duration,
      startedAt: Date.now()
    }

    if (!paused.value) {
      timer.timeoutId = setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    timers.set(id, timer)
  }

  function showNotification(
    message: string,
    type: NotificationType = 'info',
    duration = DEFAULT_DURATION_MS
  ): string {
    const trimmed = String(message ?? '').trim()
    if (!trimmed) return ''

    const existing = notifications.value.find(
      (item) => item.message === trimmed && item.type === type
    )
    if (existing) {
      existing.count += 1
      existing.createdAt = Date.now()
      scheduleTimer(existing.id, duration)
      return existing.id
    }

    const id = `cpamp-notice-${++nextNotificationId}`
    const item: NotificationItem = {
      id,
      message: trimmed,
      type,
      duration,
      count: 1,
      createdAt: Date.now()
    }

    const next = [...notifications.value, item]
    if (next.length > MAX_NOTIFICATIONS) {
      const evicted = next.slice(0, next.length - MAX_NOTIFICATIONS)
      evicted.forEach((old) => clearTimer(old.id))
      notifications.value = next.slice(next.length - MAX_NOTIFICATIONS)
    } else {
      notifications.value = next
    }

    scheduleTimer(id, duration)
    return id
  }

  function pauseTimers() {
    if (paused.value) return
    paused.value = true
    const now = Date.now()
    timers.forEach((entry) => {
      if (entry.timeoutId) {
        clearTimeout(entry.timeoutId)
        entry.timeoutId = null
        entry.remaining = Math.max(0, entry.remaining - (now - entry.startedAt))
      }
    })
  }

  function resumeTimers() {
    if (!paused.value) return
    paused.value = false
    const now = Date.now()
    timers.forEach((entry, id) => {
      if (entry.remaining <= 0) {
        removeNotification(id)
        return
      }
      entry.startedAt = now
      entry.timeoutId = setTimeout(() => {
        removeNotification(id)
      }, entry.remaining)
    })
  }

  function clearAll() {
    Array.from(timers.keys()).forEach((id) => clearTimer(id))
    notifications.value = []
  }

  return {
    notifications,
    showNotification,
    removeNotification,
    pauseTimers,
    resumeTimers,
    clearAll
  }
})
