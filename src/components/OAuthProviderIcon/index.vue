<script setup lang="ts">
import { computed } from 'vue'
import { getOAuthProviderMeta } from '@/utils/oauthProvider'

const props = withDefaults(
  defineProps<{
    provider: string
    size?: number
  }>(),
  {
    size: 20
  }
)

const meta = computed(() => getOAuthProviderMeta(props.provider))

const fallbackStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(11, Math.round(props.size * 0.65))}px`
}))
</script>

<template>
  <svg
    v-if="meta.key === 'feishu'"
    class="oauth-provider-icon"
    :class="meta.accentClass"
    viewBox="0 0 24 24"
    :width="props.size"
    :height="props.size"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5.0 4.4C4.4 4.1 3.8 4.7 4.0 5.3L6.0 11.4C6.1 11.8 6.6 12.0 7.0 11.8L12.6 9.0C13.1 8.7 13.1 8.0 12.6 7.8L5.0 4.4Z"
      fill="currentColor"
    />
    <path
      d="M6.8 13.4L19.9 6.8C20.5 6.5 21.1 7.1 20.9 7.7C19.4 13.2 15.6 17.9 9.6 19.2C7.1 19.7 4.8 18.8 3.6 17.0C3.3 16.6 3.5 16.0 3.9 15.7L6.8 13.4Z"
      fill="currentColor"
    />
  </svg>

  <svg
    v-else-if="meta.key === 'wechat'"
    class="oauth-provider-icon"
    :class="meta.accentClass"
    viewBox="0 0 24 24"
    :width="props.size"
    :height="props.size"
    fill="none"
    aria-hidden="true"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M16.85 8.15A7.5 6.2 0 1 0 4.8 14.23L3.5 16.8L6.9 15.18A7.5 6.2 0 0 0 8.35 15.53A7.5 6.4 0 0 1 16.85 8.15ZM6.7 8.9A0.9 0.9 0 1 0 6.7 7.1A0.9 0.9 0 0 0 6.7 8.9ZM11.0 8.9A0.9 0.9 0 1 0 11.0 7.1A0.9 0.9 0 0 0 11.0 8.9Z"
      fill="currentColor"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M18.1 19.23A6.2 5.1 0 1 1 20.1 18.18L20.6 20.7L18.1 19.23ZM13.8 14.55A0.85 0.85 0 1 0 13.8 12.85A0.85 0.85 0 0 0 13.8 14.55ZM17.8 14.55A0.85 0.85 0 1 0 17.8 12.85A0.85 0.85 0 0 0 17.8 14.55Z"
      fill="currentColor"
    />
  </svg>

  <span
    v-else
    class="oauth-provider-icon oauth-provider-icon--fallback"
    :class="meta.accentClass"
    :style="fallbackStyle"
    aria-hidden="true"
  >
    {{ meta.fallbackText }}
  </span>
</template>

<style lang="scss" scoped>
.oauth-provider-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.oauth-provider-icon--fallback {
  font-weight: 700;
  user-select: none;
}
</style>
