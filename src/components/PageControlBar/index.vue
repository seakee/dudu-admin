<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    as?: 'section' | 'header' | 'div'
    ariaLabel?: string
    ariaLabelledby?: string
  }>(),
  {
    as: 'section',
    ariaLabel: undefined,
    ariaLabelledby: undefined
  }
)

const slots = useSlots()

const hasLeading = computed(() => Boolean(slots.leading))
const hasActions = computed(() => Boolean(slots.actions))
const hasTopRow = computed(() => hasLeading.value || hasActions.value)
const hasToolbar = computed(() => Boolean(slots.toolbar))
const hasAnyContent = computed(() => hasTopRow.value || hasToolbar.value)
</script>

<template>
  <component
    :is="props.as"
    v-if="hasAnyContent"
    class="page-control-bar"
    :aria-label="props.ariaLabel"
    :aria-labelledby="props.ariaLabelledby"
  >
    <div
      v-if="hasTopRow"
      class="top-row"
    >
      <div
        v-if="hasLeading"
        class="leading"
      >
        <slot name="leading" />
      </div>
      <div
        v-if="hasActions"
        class="actions"
      >
        <slot name="actions" />
      </div>
    </div>
    <div
      v-if="hasToolbar"
      class="toolbar"
      :class="{ 'is-toolbar-only': !hasTopRow }"
    >
      <slot name="toolbar" />
    </div>
  </component>
</template>

<style lang="scss" scoped>
.page-control-bar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: visible;
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-lg);
  background: var(--bg-primary);
  box-shadow: var(--app-specular-highlight);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);

  @include mobile {
    border-radius: var(--app-radius-md);
  }
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
  min-width: 0;
  padding: 16px 20px;

  @include mobile {
    padding: 12px 14px;
  }
}

.leading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
  flex: 1 1 auto;

  @include mobile {
    width: 100%;
  }
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
  margin-left: auto;

  @include mobile {
    justify-content: flex-start;
    margin-left: 0;
  }

  :deep(svg) {
    display: block;
  }
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow: visible;
  padding: 14px 20px;
  border-top: 1px solid var(--border-subtle);
  border-bottom-left-radius: var(--app-radius-lg);
  border-bottom-right-radius: var(--app-radius-lg);
  background: color-mix(in srgb, var(--surface-subtle) 36%, var(--bg-primary));

  @include mobile {
    padding: 12px 14px;
    border-bottom-left-radius: var(--app-radius-md);
    border-bottom-right-radius: var(--app-radius-md);
  }

  &.is-toolbar-only {
    border-top: 0;
    border-radius: inherit;
  }
}
</style>
