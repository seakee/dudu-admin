<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    size?: number | string
    alt?: string
    fallback?: string
    shape?: 'circle' | 'square'
  }>(),
  {
    src: '',
    size: 36,
    alt: '',
    fallback: '',
    shape: 'circle'
  }
)

const imageFailed = ref(false)

watch(
  () => props.src,
  () => {
    imageFailed.value = false
  }
)

const showImage = computed(() => Boolean(props.src?.trim()) && !imageFailed.value)

const resolvedCssSize = computed(() => {
  if (typeof props.size === 'number') return `${props.size}px`
  const trimmed = String(props.size).trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed
})

const numericSize = computed(() => {
  if (typeof props.size === 'number') return props.size
  const parsed = Number.parseFloat(String(props.size))
  return Number.isFinite(parsed) ? parsed : 36
})

const avatarStyle = computed<CSSProperties>(() => ({
  width: resolvedCssSize.value,
  height: resolvedCssSize.value,
  fontSize: `${Math.max(12, Math.round(numericSize.value * 0.42))}px`
}))

const resolvedFallbackText = computed(() => {
  if (props.fallback) return props.fallback
  const trimmedAlt = props.alt.trim()
  if (!trimmedAlt) return ''
  const [firstChar] = Array.from(trimmedAlt)
  return firstChar ? firstChar.toUpperCase() : ''
})
</script>

<template>
  <span
    class="app-avatar"
    :class="[
      `is-${props.shape}`,
      { 'is-fallback': !showImage }
    ]"
    :style="avatarStyle"
  >
    <img
      v-if="showImage"
      :src="props.src"
      :alt="props.alt"
      class="app-avatar__img"
      @error="imageFailed = true"
    >
    <span
      v-else
      class="app-avatar__fallback"
    >
      <slot>
        <template v-if="resolvedFallbackText">
          {{ resolvedFallbackText }}
        </template>
        <AppIcon
          v-else
          name="User"
          :size="Math.max(14, Math.round(numericSize * 0.48))"
        />
      </slot>
    </span>
  </span>
</template>

<style lang="scss" scoped>
.app-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--primary-subtle);
  color: var(--primary-text);
  border: 1px solid var(--border-subtle);
  font-weight: 700;
  line-height: 1;
  user-select: none;
  vertical-align: middle;

  &.is-circle {
    border-radius: 50%;
  }

  &.is-square {
    border-radius: var(--app-radius-sm);
  }
}

.app-avatar__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-avatar__fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
