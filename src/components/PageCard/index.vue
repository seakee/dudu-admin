<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'search' | 'table' | 'toolbar' | 'welcome' | 'stat'
    shadow?: 'never' | 'always' | 'hover'
    flush?: boolean
  }>(),
  {
    variant: undefined,
    shadow: 'never',
    flush: false
  }
)

const slots = useSlots()
const hasHeader = computed(() => Boolean(slots.header))

const cardClass = computed(() => [
  'page-card',
  props.variant ? `page-card--${props.variant}` : '',
  props.flush || props.variant === 'table' ? 'is-flush' : ''
])
</script>

<template>
  <section
    :class="cardClass"
    :data-shadow="props.shadow"
  >
    <header
      v-if="hasHeader"
      class="page-card__header"
    >
      <slot name="header" />
    </header>
    <div class="page-card__body">
      <slot />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.page-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-lg);
  box-shadow: var(--app-specular-highlight);
  color: var(--text-primary);
  overflow: hidden;
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);

  @include mobile {
    border-radius: var(--app-radius-md);
  }
}

.page-card--search,
.page-card--toolbar,
.page-card--table,
.page-card--welcome,
.page-card--stat {
  margin-bottom: 0;
}

.page-card__header {
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-weight: 600;
  padding: 14px 20px;
}

.page-card__body {
  padding: var(--app-card-padding);

  @include mobile {
    padding: 16px;
  }
}

.page-card.is-flush > .page-card__body {
  padding: 0;
}
</style>
