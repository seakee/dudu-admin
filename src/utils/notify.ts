import { useNotificationStore, type NotificationType } from '@/stores/notification'

export interface NotifyOptions {
  message?: string
  type?: NotificationType
  duration?: number
}

function dispatch(type: NotificationType, messageOrOptions: string | NotifyOptions, duration?: number) {
  const store = useNotificationStore()
  if (typeof messageOrOptions === 'string') {
    return store.showNotification(messageOrOptions, type, duration)
  }
  return store.showNotification(
    messageOrOptions.message ?? '',
    messageOrOptions.type ?? type,
    messageOrOptions.duration ?? duration
  )
}

export function notify(messageOrOptions: string | NotifyOptions) {
  if (typeof messageOrOptions === 'string') {
    return dispatch('info', messageOrOptions)
  }
  return dispatch(messageOrOptions.type ?? 'info', messageOrOptions)
}

notify.success = (message: string, duration?: number) => dispatch('success', message, duration)
notify.error = (message: string, duration?: number) => dispatch('error', message, duration)
notify.warning = (message: string, duration?: number) => dispatch('warning', message, duration)
notify.info = (message: string, duration?: number) => dispatch('info', message, duration)

export default notify
