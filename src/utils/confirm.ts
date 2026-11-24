import { useConfirmStore, type ConfirmDialogVariant } from '@/stores/confirm'
import { i18n } from '@/i18n'

export interface ConfirmDialogOptions {
  confirmButtonText?: string
  cancelButtonText?: string
  type?: 'warning' | 'info' | 'success' | 'error' | 'danger'
}

function mapVariant(type?: ConfirmDialogOptions['type']): ConfirmDialogVariant {
  if (type === 'error' || type === 'danger') return 'danger'
  if (type === 'warning') return 'warning'
  if (type === 'info') return 'info'
  return 'primary'
}

export function confirmDialog(
  message: string,
  title?: string,
  options: ConfirmDialogOptions = {}
): Promise<void> {
  const { t } = i18n.global
  const store = useConfirmStore()

  return store.open({
    title: title || t('navbar.dialogTitle'),
    message,
    confirmText: options.confirmButtonText || t('common.confirm'),
    cancelText: options.cancelButtonText || t('common.cancel'),
    variant: mapVariant(options.type)
  })
}

export default confirmDialog
