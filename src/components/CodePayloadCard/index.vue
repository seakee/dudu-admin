<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { notify } from '@/utils/notify'

const props = withDefaults(
  defineProps<{
    title: string
    payload?: unknown
    copyable?: boolean
    copyLabel?: string
    copySuccessMessage?: string
    emptyText?: string
    maxHeight?: string
    minHeight?: string
  }>(),
  {
    payload: undefined,
    copyable: true,
    copyLabel: undefined,
    copySuccessMessage: undefined,
    emptyText: '-',
    maxHeight: '320px',
    minHeight: '120px'
  }
)

const { t, te, locale } = useI18n()

function formatPayload(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return value
    }
  }

  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

const formattedPayload = computed(() => formatPayload(props.payload))
const displayPayload = computed(() => formattedPayload.value || props.emptyText)
const resolvedCopyLabel = computed(() => props.copyLabel || t('common.copy'))
const resolvedCopySuccessMessage = computed(() => {
  if (props.copySuccessMessage) return props.copySuccessMessage
  if (te('common.copySuccess')) return t('common.copySuccess')
  return locale.value.startsWith('zh') ? '已复制' : 'Copied'
})
const resolvedCopyFailedMessage = computed(() => {
  if (te('common.copyFailed')) return t('common.copyFailed')
  if (te('system.operation.message.copyFailed')) return t('system.operation.message.copyFailed')
  return locale.value.startsWith('zh') ? '复制失败' : 'Copy failed'
})

const viewerStyle = computed<CSSProperties>(() => ({
  minHeight: props.minHeight,
  maxHeight: props.maxHeight
}))

async function writeToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback to execCommand when Clipboard API is unavailable or denied
    }
  }

  if (typeof document === 'undefined' || !document.body) {
    return false
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  const selection = document.getSelection()
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  } finally {
    document.body.removeChild(textarea)
    if (selection && previousRange) {
      selection.removeAllRanges()
      selection.addRange(previousRange)
    }
  }

  return copied
}

async function handleCopy() {
  const content = formattedPayload.value
  if (!content) {
    notify.error(resolvedCopyFailedMessage.value)
    return
  }

  const copied = await writeToClipboard(content)
  if (copied) {
    notify.success(resolvedCopySuccessMessage.value)
  } else {
    notify.error(resolvedCopyFailedMessage.value)
  }
}
</script>

<template>
  <article class="code-payload-card">
    <header class="code-payload-card__header">
      <h4 class="code-payload-card__title">
        {{ props.title }}
      </h4>
      <AppButton
        v-if="props.copyable"
        variant="link"
        size="sm"
        @click="handleCopy"
      >
        {{ resolvedCopyLabel }}
      </AppButton>
    </header>
    <pre
      class="code-payload-card__viewer"
      :style="viewerStyle"
    >{{ displayPayload }}</pre>
  </article>
</template>

<style lang="scss" scoped>
.code-payload-card {
  min-width: 0;
}

.code-payload-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.code-payload-card__title {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.code-payload-card__viewer {
  margin: 0;
  padding: 14px;
  overflow: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-sm);
  background: var(--surface-subtle);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  scrollbar-width: thin;
  scrollbar-color: var(--border-primary) transparent;
}
</style>
