<script setup lang="ts">
import { computed } from 'vue'
import type { StatusPillTone } from '@/components/types'

const props = withDefaults(
  defineProps<{
    tone?: StatusPillTone
    label?: string | number
    dot?: boolean
    compact?: boolean
    mono?: boolean
  }>(),
  {
    tone: 'neutral',
    label: '',
    dot: false,
    compact: false,
    mono: false
  }
)

const toneClass = computed(() =>
  props.tone && props.tone !== 'neutral' ? `is-${props.tone}` : ''
)

const pillClasses = computed(() => [
  'status-pill',
  toneClass.value,
  {
    'is-compact': props.compact,
    'font-mono': props.mono
  }
])

const dotClasses = computed(() => ['status-dot', toneClass.value])
</script>

<template>
  <span :class="pillClasses">
    <span
      v-if="props.dot"
      :class="dotClasses"
      aria-hidden="true"
    />
    <slot>
      {{ props.label }}
    </slot>
  </span>
</template>
