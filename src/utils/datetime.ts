import dayjs from 'dayjs'

export function formatDateTime(value?: string | number | Date | null): string {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  const date = dayjs(value)
  if (!date.isValid()) {
    return '-'
  }

  return date.format('YYYY-MM-DD HH:mm:ss')
}
