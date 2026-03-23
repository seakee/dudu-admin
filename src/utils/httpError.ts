export interface HandledHttpError extends Error {
  __handledByHttpInterceptor?: boolean
  __businessCode?: number
}

export function markHandledHttpError(error: Error, businessCode?: number): HandledHttpError {
  const handledError = error as HandledHttpError
  handledError.__handledByHttpInterceptor = true

  if (typeof businessCode === 'number') {
    handledError.__businessCode = businessCode
  }

  return handledError
}

export function isHandledHttpError(error: unknown): error is HandledHttpError {
  return !!error && typeof error === 'object' && (error as HandledHttpError).__handledByHttpInterceptor === true
}
