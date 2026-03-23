import type { PasskeyCredential } from '@/types/api'

type MaybeBufferSource = ArrayBuffer | ArrayBufferView

function normalizeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4

  if (!padding) {
    return base64
  }

  return `${base64}${'='.repeat(4 - padding)}`
}

function toUint8Array(buffer: MaybeBufferSource) {
  if (buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer)
  }

  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

export function isWebAuthnSupported() {
  return typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && typeof PublicKeyCredential !== 'undefined'
    && !!navigator.credentials
}

export function decodeBase64Url(value?: string | null) {
  if (!value) {
    return new ArrayBuffer(0)
  }

  const binary = atob(normalizeBase64Url(value))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return bytes.buffer
}

export function encodeBase64Url(value: MaybeBufferSource) {
  const bytes = toUint8Array(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function hasWrappedPublicKey(rawOptions: Record<string, any>) {
  return !!rawOptions?.publicKey && typeof rawOptions.publicKey === 'object'
}

function normalizeRequestPublicKeyOptions(rawOptions: Record<string, any>) {
  const options = hasWrappedPublicKey(rawOptions)
    ? rawOptions.publicKey as Record<string, any>
    : rawOptions

  return {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    allowCredentials: Array.isArray(options.allowCredentials)
      ? options.allowCredentials.map((item: Record<string, any>) => ({
          ...item,
          id: decodeBase64Url(item.id)
        }))
      : undefined
  } as PublicKeyCredentialRequestOptions
}

function normalizeCreationPublicKeyOptions(rawOptions: Record<string, any>) {
  const options = hasWrappedPublicKey(rawOptions)
    ? rawOptions.publicKey as Record<string, any>
    : rawOptions

  return {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    user: options.user
      ? {
          ...options.user,
          id: decodeBase64Url(options.user.id)
        }
      : options.user,
    excludeCredentials: Array.isArray(options.excludeCredentials)
      ? options.excludeCredentials.map((item: Record<string, any>) => ({
          ...item,
          id: decodeBase64Url(item.id)
        }))
      : undefined
  } as PublicKeyCredentialCreationOptions
}

function serializePasskeyCredential(credential: PublicKeyCredential): PasskeyCredential {
  const response = credential.response as AuthenticatorResponse

  if ('attestationObject' in response) {
    const attestationResponse = response as AuthenticatorAttestationResponse
    const transports = typeof attestationResponse.getTransports === 'function'
      ? attestationResponse.getTransports()
      : undefined

    return {
      id: credential.id,
      raw_id: encodeBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: encodeBase64Url(attestationResponse.clientDataJSON),
        attestationObject: encodeBase64Url(attestationResponse.attestationObject),
        ...(transports?.length ? { transports } : {})
      }
    }
  }

  if ('authenticatorData' in response) {
    const assertionResponse = response as AuthenticatorAssertionResponse

    return {
      id: credential.id,
      raw_id: encodeBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: encodeBase64Url(assertionResponse.clientDataJSON),
        authenticatorData: encodeBase64Url(assertionResponse.authenticatorData),
        signature: encodeBase64Url(assertionResponse.signature),
        ...(assertionResponse.userHandle ? { userHandle: encodeBase64Url(assertionResponse.userHandle) } : {})
      }
    }
  }

  throw new Error('Unsupported WebAuthn response')
}

export async function startPasskeyAuthentication(rawOptions: Record<string, any>) {
  if (!isWebAuthnSupported()) {
    throw new Error('WEBAUTHN_UNSUPPORTED')
  }

  const requestOptions = hasWrappedPublicKey(rawOptions)
    ? {
        ...rawOptions,
        publicKey: normalizeRequestPublicKeyOptions(rawOptions)
      }
    : {
        publicKey: normalizeRequestPublicKeyOptions(rawOptions)
      }

  const credential = await navigator.credentials.get(requestOptions as CredentialRequestOptions)

  if (!credential) {
    throw new DOMException('Authentication cancelled', 'NotAllowedError')
  }

  return serializePasskeyCredential(credential as PublicKeyCredential)
}

export async function startPasskeyRegistration(rawOptions: Record<string, any>) {
  if (!isWebAuthnSupported()) {
    throw new Error('WEBAUTHN_UNSUPPORTED')
  }

  const creationOptions = hasWrappedPublicKey(rawOptions)
    ? {
        ...rawOptions,
        publicKey: normalizeCreationPublicKeyOptions(rawOptions)
      }
    : {
        publicKey: normalizeCreationPublicKeyOptions(rawOptions)
      }

  const credential = await navigator.credentials.create(creationOptions as CredentialCreationOptions)

  if (!credential) {
    throw new DOMException('Registration cancelled', 'NotAllowedError')
  }

  return serializePasskeyCredential(credential as PublicKeyCredential)
}

export function getWebAuthnErrorI18nKey(error: unknown) {
  if (error instanceof Error && error.message === 'WEBAUTHN_UNSUPPORTED') {
    return 'passkey.unsupported'
  }

  if (!(error instanceof Error)) {
    return 'passkey.failed'
  }

  switch (error.name) {
    case 'AbortError':
    case 'NotAllowedError':
      return 'passkey.cancelled'
    case 'InvalidStateError':
      return 'passkey.invalidState'
    case 'NotSupportedError':
      return 'passkey.unsupported'
    case 'SecurityError':
      return 'passkey.security'
    default:
      return 'passkey.failed'
  }
}
