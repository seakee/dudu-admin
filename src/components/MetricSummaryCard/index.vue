<script lang="ts">
let nextMetricTooltipUid = 0
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import type { MetricSummaryAccent, MetricSummaryDensity } from '@/components/types'

const props = withDefaults(
  defineProps<{
    label: string
    fullLabel?: string
    value: string | number
    valueTitle?: string
    meta?: string
    accent?: MetricSummaryAccent
    density?: MetricSummaryDensity
    icon?: string
    points?: number[]
  }>(),
  {
    fullLabel: undefined,
    valueTitle: undefined,
    meta: undefined,
    accent: 'blue',
    density: 'default',
    icon: undefined,
    points: undefined
  }
)

const slots = useSlots()
const tooltipId = `metric-summary-tooltip-${++nextMetricTooltipUid}`

const isCompact = computed(() => props.density === 'compact')
const resolvedLabel = computed(() => props.fullLabel || props.label)
const displayValue = computed(() => String(props.value))
const resolvedTooltipValue = computed(() => props.valueTitle?.trim() || '')

const hasValueTooltip = computed(
  () =>
    !isCompact.value &&
    Boolean(resolvedTooltipValue.value) &&
    resolvedTooltipValue.value !== displayValue.value
)

const hasIcon = computed(() => Boolean(slots.icon) || Boolean(props.icon))
const hasMeta = computed(
  () => !isCompact.value && (Boolean(slots.meta) || Boolean(props.meta))
)

const sparklinePath = computed(() => {
  if (isCompact.value || !props.points || props.points.length < 2) {
    return ''
  }
  const validPoints = props.points.filter((point) => Number.isFinite(point))
  if (validPoints.length < 2) {
    return ''
  }

  const min = Math.min(...validPoints)
  const max = Math.max(...validPoints)
  const range = max - min
  const lastIndex = validPoints.length - 1

  return validPoints
    .map((point, index) => {
      const x = Number(((index / lastIndex) * 100).toFixed(2))
      const y =
        range === 0
          ? 15
          : Number((26 - ((point - min) / range) * 22).toFixed(2))
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
})

const cardClasses = computed(() => [
  'metric-summary-card',
  `is-accent-${props.accent}`,
  {
    'is-compact': isCompact.value
  }
])
</script>

<template>
  <div :class="cardClasses">
    <div class="metric-summary-card__header">
      <span
        v-if="hasIcon"
        class="metric-summary-card__icon"
        aria-hidden="true"
      >
        <slot name="icon">
          <AppIcon
            v-if="props.icon"
            :name="props.icon"
          />
        </slot>
      </span>
      <span
        class="metric-summary-card__label"
        :title="resolvedLabel"
      >
        {{ props.label }}
      </span>
    </div>

    <div class="metric-summary-card__body">
      <span class="metric-summary-card__value-wrap">
        <strong
          class="metric-summary-card__value"
          :tabindex="hasValueTooltip ? 0 : undefined"
          :aria-describedby="hasValueTooltip ? tooltipId : undefined"
          :title="props.valueTitle"
        >
          {{ props.value }}
        </strong>
        <span
          v-if="hasValueTooltip"
          :id="tooltipId"
          class="metric-summary-card__tooltip"
          role="tooltip"
        >
          <span class="metric-summary-card__tooltip-label">
            {{ resolvedLabel }}
          </span>
          <span class="metric-summary-card__tooltip-value">
            {{ resolvedTooltipValue }}
          </span>
        </span>
      </span>

      <span
        v-if="hasMeta"
        class="metric-summary-card__meta"
        :title="props.meta"
      >
        <slot name="meta">
          {{ props.meta }}
        </slot>
      </span>
    </div>

    <div
      v-if="sparklinePath"
      class="metric-summary-card__chart"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        <path :d="sparklinePath" />
      </svg>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.metric-summary-card {
  --summary-accent: var(--data-blue-base);

  position: relative;
  isolation: isolate;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  height: auto;
  min-height: 112px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-md);
  background: var(--bg-primary);
  box-shadow: var(--app-specular-highlight);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    z-index: 5;
    transform: translateY(-1px);
    border-color: var(--border-primary);
  }

  &:focus-within {
    z-index: 5;
  }

  &.is-accent-blue {
    --summary-accent: var(--data-blue-base);
  }

  &.is-accent-green {
    --summary-accent: var(--data-emerald-base);
  }

  &.is-accent-red {
    --summary-accent: var(--data-red-base);
  }

  &.is-accent-amber {
    --summary-accent: var(--data-amber-base);
  }

  &.is-accent-indigo {
    --summary-accent: var(--data-violet-base);
  }

  &.is-accent-cyan {
    --summary-accent: var(--data-cyan-base);
  }

  &.is-accent-violet {
    --summary-accent: var(--data-violet-base);
  }

  &.is-accent-teal {
    --summary-accent: var(--data-teal-base);
  }

  &.is-accent-neutral {
    --summary-accent: var(--data-slate-base);
  }
}

.metric-summary-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.metric-summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: var(--app-radius-sm);
  background: color-mix(in srgb, var(--summary-accent) 12%, transparent);
  color: var(--summary-accent);
  font-size: 16px;

  :deep(svg) {
    width: 16px;
    height: 16px;
  }
}

.metric-summary-card__label {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-summary-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-top: auto;
}

.metric-summary-card__value-wrap {
  position: relative;
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  &:hover .metric-summary-card__tooltip,
  &:focus-within .metric-summary-card__tooltip {
    opacity: 1;
    transform: translateY(0);
  }
}

.metric-summary-card__value {
  min-width: 0;
  max-width: 100%;
  color: var(--kpi-value-color);
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  letter-spacing: 0;
  overflow-wrap: anywhere;
  white-space: normal;
  cursor: default;
  outline: 0;

  &[tabindex='0'] {
    cursor: help;
  }

  &[tabindex='0']:focus-visible {
    border-radius: var(--app-radius-xs);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--summary-accent) 28%, transparent);
  }
}

.metric-summary-card__tooltip {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 4;
  display: grid;
  gap: 3px;
  width: max-content;
  min-width: min(160px, 100%);
  max-width: min(280px, calc(100vw - 32px));
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--data-blue-base) 42%, var(--border-color));
  border-top: 3px solid var(--data-blue-base);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-strong);
  color: var(--text-primary);
  /* floating layer: elevation allowed */
  box-shadow: var(--floating-shadow-md);
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;

  &::after {
    content: '';
    position: absolute;
    left: 16px;
    bottom: -5px;
    width: 9px;
    height: 9px;
    border-right: 1px solid color-mix(in srgb, var(--data-blue-base) 78%, var(--border-color));
    border-bottom: 1px solid color-mix(in srgb, var(--data-blue-base) 78%, var(--border-color));
    background: inherit;
    transform: rotate(45deg);
  }
}

.metric-summary-card__tooltip-label {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.metric-summary-card__tooltip-value {
  color: var(--primary-text);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.metric-summary-card__meta {
  margin-top: 5px;
  color: var(--text-secondary);
  display: block;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.metric-summary-card__chart {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 0;
  width: calc(46% - 8px);
  min-width: 72px;
  height: 28px;
  color: var(--summary-accent);
  opacity: 0.65;
  pointer-events: none;

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  path {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.42;
  }
}

.metric-summary-card.is-compact {
  gap: 16px;
  min-height: 96px;
  padding: 10px;

  .metric-summary-card__icon {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
    font-size: 14px;

    :deep(svg) {
      width: 14px;
      height: 14px;
    }
  }

  .metric-summary-card__label {
    font-size: 11px;
  }

  .metric-summary-card__body {
    margin-top: 0;
  }

  .metric-summary-card__value {
    font-size: 15px;
    line-height: 1.1;
  }
}

@include mobile {
  .metric-summary-card {
    gap: 6px;
    min-height: 76px;
    padding: 10px;
  }

  .metric-summary-card__icon {
    width: 22px;
    height: 22px;
    flex-basis: 22px;
    font-size: 13px;

    :deep(svg) {
      width: 13px;
      height: 13px;
    }
  }

  .metric-summary-card__label {
    font-size: 11px;
  }

  .metric-summary-card__value {
    font-size: 18px;
    line-height: 1.1;
  }

  .metric-summary-card__meta {
    margin-top: 2px;
    font-size: 10.5px;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metric-summary-card__chart {
    display: none;
  }
}
</style>
