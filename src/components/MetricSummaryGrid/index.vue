<script setup lang="ts">
import { computed } from 'vue'
import MetricSummaryCard from '@/components/MetricSummaryCard/index.vue'
import type { MetricSummaryCardItem, MetricSummaryDensity } from '@/components/types'

const props = withDefaults(
  defineProps<{
    cards?: ReadonlyArray<MetricSummaryCardItem>
    columns?: number
    density?: MetricSummaryDensity
  }>(),
  {
    cards: undefined,
    columns: 4,
    density: 'default'
  }
)

const isCompact = computed(() => props.density === 'compact')

const gridStyle = computed(() => ({
  '--metric-summary-columns': String(Math.max(1, props.columns))
}))
</script>

<template>
  <div
    class="metric-summary-grid"
    :class="{ 'is-compact': isCompact }"
    :data-metric-summary-density="props.density"
    :style="gridStyle"
  >
    <slot>
      <MetricSummaryCard
        v-for="card in props.cards"
        :key="card.id"
        :label="card.label"
        :full-label="card.fullLabel"
        :value="card.value"
        :value-title="card.valueTitle"
        :meta="card.meta"
        :accent="card.accent"
        :density="props.density"
        :icon="card.icon"
        :points="card.points"
      />
    </slot>
  </div>
</template>

<style lang="scss" scoped>
.metric-summary-grid {
  --metric-summary-columns: 4;

  display: grid;
  grid-template-columns: repeat(var(--metric-summary-columns, 4), minmax(0, 1fr));
  grid-auto-rows: minmax(112px, auto);
  gap: 10px;
  min-width: 0;
  width: 100%;

  &.is-compact {
    grid-auto-rows: minmax(96px, auto);
    gap: 8px;
  }

  @include tablet {
    grid-template-columns: repeat(min(var(--metric-summary-columns, 4), 2), minmax(0, 1fr));
  }

  @include mobile {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: auto;
    gap: 8px;
  }
}
</style>
