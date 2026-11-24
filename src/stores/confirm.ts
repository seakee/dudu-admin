import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ConfirmDialogVariant = 'primary' | 'danger' | 'warning' | 'info'

export interface ConfirmDialogPayload {
  title: string
  message: string
  confirmText: string
  cancelText: string
  variant: ConfirmDialogVariant
}

interface PendingConfirm extends ConfirmDialogPayload {
  resolve: () => void
  reject: (reason?: string) => void
}

export const useConfirmStore = defineStore('confirm', () => {
  const current = ref<PendingConfirm | null>(null)
  const queue: PendingConfirm[] = []

  function pumpNext() {
    if (!current.value && queue.length > 0) {
      current.value = queue.shift() ?? null
    }
  }

  function open(payload: ConfirmDialogPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      queue.push({ ...payload, resolve, reject })
      pumpNext()
    })
  }

  function confirm() {
    const active = current.value
    if (!active) return
    current.value = null
    active.resolve()
    pumpNext()
  }

  function cancel() {
    const active = current.value
    if (!active) return
    current.value = null
    active.reject('cancel')
    pumpNext()
  }

  return {
    current,
    open,
    confirm,
    cancel
  }
})
