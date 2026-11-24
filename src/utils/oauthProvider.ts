import type { StatusPillTone } from '@/components/types'

export type KnownOAuthProvider = 'feishu' | 'wechat'

export interface OAuthProviderMeta {
  key: string
  fallbackText: string
  tone: StatusPillTone
  accentClass: string
  i18nKey: string
}

export function getOAuthProviderMeta(provider?: string): OAuthProviderMeta {
  const normalized = provider?.trim().toLowerCase() ?? ''

  if (normalized === 'feishu') {
    return {
      key: 'feishu',
      fallbackText: '飞',
      tone: 'success',
      accentClass: 'is-feishu',
      i18nKey: 'profile.oauth.providerFeishu'
    }
  }

  if (normalized === 'wechat') {
    return {
      key: 'wechat',
      fallbackText: '微',
      tone: 'info',
      accentClass: 'is-wechat',
      i18nKey: 'profile.oauth.providerWechat'
    }
  }

  return {
    key: normalized,
    fallbackText: normalized ? normalized.charAt(0).toUpperCase() : 'O',
    tone: 'neutral',
    accentClass: 'is-default',
    i18nKey: ''
  }
}
