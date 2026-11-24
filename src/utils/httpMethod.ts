import type { SelectOption, StatusPillTone } from '@/components/types'

export const HTTP_METHOD_VALUES = ['GET', 'POST', 'PUT', 'DELETE'] as const

export const HTTP_METHOD_OPTIONS: SelectOption[] = HTTP_METHOD_VALUES.map((method) => ({
  label: method,
  value: method
}))

export function getHttpMethodTone(method?: string): StatusPillTone {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'success'
    case 'POST':
      return 'info'
    case 'PUT':
      return 'warning'
    case 'DELETE':
      return 'danger'
    default:
      return 'neutral'
  }
}
