<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    primary?: string
    secondary?: string
    monoPrimary?: boolean
    monoSecondary?: boolean
    tabular?: boolean
    truncate?: boolean
  }>(),
  {
    primary: '',
    secondary: '',
    monoPrimary: false,
    monoSecondary: false,
    tabular: false,
    truncate: true
  }
)
</script>

<template>
  <div class="table-cell-stack">
    <div
      v-if="$slots.prefix"
      class="table-cell-stack__prefix"
    >
      <slot name="prefix" />
    </div>

    <div class="table-cell-stack__content">
      <div
        v-if="props.primary || $slots.primary || $slots.default"
        class="table-cell-stack__primary"
        :class="{
          'font-mono': props.monoPrimary,
          'tabular-nums': props.tabular,
          'is-truncate': props.truncate
        }"
      >
        <slot name="primary">
          <slot>{{ props.primary }}</slot>
        </slot>
      </div>

      <div
        v-if="props.secondary || $slots.secondary"
        class="table-cell-stack__secondary"
        :class="{
          'font-mono': props.monoSecondary,
          'tabular-nums': props.tabular,
          'is-truncate': props.truncate
        }"
      >
        <slot name="secondary">
          {{ props.secondary }}
        </slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.table-cell-stack {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  width: 100%;
}

.table-cell-stack__prefix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.table-cell-stack__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.table-cell-stack__primary {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);

  &.is-truncate {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.table-cell-stack__secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-tertiary);

  &.is-truncate {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
