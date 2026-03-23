import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function useFormLabelWidth(zhWidth = '80px', enWidth = '120px') {
  const { locale } = useI18n()
  return computed(() => (locale.value === 'zh-CN' ? zhWidth : enWidth))
}
