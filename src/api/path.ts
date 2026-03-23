const DEFAULT_API_ROUTE_PREFIX = '/dudu-admin-api'

function normalizeSegment(value: string) {
  return value.replace(/\/+/g, '/')
}

export function normalizeApiRoutePrefix(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === '/') {
    return DEFAULT_API_ROUTE_PREFIX
  }

  return normalizeSegment(`/${trimmed.replace(/^\/+|\/+$/g, '')}`)
}

function normalizeApiPath(path: string) {
  const trimmed = path.trim()
  if (!trimmed || trimmed === '/') {
    return '/'
  }

  return normalizeSegment(`/${trimmed.replace(/^\/+/, '')}`)
}

export const apiRoutePrefix = normalizeApiRoutePrefix(import.meta.env.VITE_API_ROUTE_PREFIX)

export function buildApiPath(path: string) {
  const normalizedPath = normalizeApiPath(path)
  if (normalizedPath === '/') {
    return apiRoutePrefix
  }

  return normalizeSegment(`${apiRoutePrefix}${normalizedPath}`)
}
