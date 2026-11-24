<script setup lang="ts">
import type { StepItem } from '@/components/types'

const props = withDefaults(
  defineProps<{
    active?: number
    steps?: ReadonlyArray<StepItem>
    alignCenter?: boolean
    finishStatus?: 'success' | 'finish'
  }>(),
  {
    active: 0,
    steps: () => [],
    alignCenter: true,
    finishStatus: 'success'
  }
)

function getStepState(index: number): 'completed' | 'active' | 'pending' {
  if (index < props.active) return 'completed'
  if (index === props.active) return 'active'
  return 'pending'
}
</script>

<template>
  <ol
    class="app-steps"
    :class="[
      `is-finish-${props.finishStatus}`,
      { 'is-align-center': props.alignCenter }
    ]"
  >
    <li
      v-for="(step, index) in props.steps"
      :key="`${index}-${step.title}`"
      class="app-steps__item"
      :class="`is-${getStepState(index)}`"
      :aria-current="index === props.active ? 'step' : undefined"
    >
      <div class="app-steps__head">
        <span
          v-if="index > 0"
          class="app-steps__line is-before"
          aria-hidden="true"
        />
        <span
          class="app-steps__indicator"
          aria-hidden="true"
        >
          <AppIcon
            v-if="index < props.active"
            name="Check"
            :size="14"
          />
          <template v-else>
            {{ index + 1 }}
          </template>
        </span>
        <span
          v-if="index < props.steps.length - 1"
          class="app-steps__line is-after"
          aria-hidden="true"
        />
      </div>

      <div class="app-steps__main">
        <div class="app-steps__title">
          {{ step.title }}
        </div>
        <div
          v-if="step.description"
          class="app-steps__description"
        >
          {{ step.description }}
        </div>
      </div>
    </li>
  </ol>
</template>

<style lang="scss" scoped>
.app-steps {
  display: flex;
  align-items: flex-start;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.app-steps__item {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-steps.is-align-center .app-steps__item {
  align-items: center;
  text-align: center;
}

.app-steps__head {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.app-steps:not(.is-align-center) .app-steps__head {
  gap: 8px;

  .app-steps__line.is-before {
    display: none;
  }
}

.app-steps.is-align-center .app-steps__head {
  justify-content: center;
}

.app-steps__line {
  flex: 1 1 0;
  height: 2px;
  background: var(--border-subtle);
  transition: background-color $transition-fast;
}

.app-steps.is-align-center .app-steps__item:first-child .app-steps__head::before,
.app-steps.is-align-center .app-steps__item:last-child .app-steps__head::after {
  content: '';
  flex: 1 1 0;
}

.app-steps__indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid var(--border-primary);
  background: var(--surface-subtle);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;
}

.app-steps__main {
  min-width: 0;
  padding: 0 6px;
}

.app-steps:not(.is-align-center) .app-steps__main {
  padding: 0 8px 0 0;
}

.app-steps__title {
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-tertiary);
  transition: color $transition-fast;
}

.app-steps__description {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.app-steps__item.is-active {
  .app-steps__indicator {
    background: var(--primary-solid);
    border-color: var(--primary-solid);
    color: var(--primary-contrast);
  }

  .app-steps__title {
    color: var(--text-primary);
  }

  .app-steps__line.is-before {
    background: var(--status-graphic-success);
  }
}

.app-steps.is-finish-finish .app-steps__item.is-active .app-steps__line.is-before {
  background: var(--primary-solid);
}

.app-steps__item.is-completed {
  .app-steps__indicator {
    background: var(--data-badge-success-bg);
    border-color: var(--status-graphic-success);
    color: var(--data-badge-success-text);
  }

  .app-steps__title {
    color: var(--text-secondary);
  }

  .app-steps__line {
    background: var(--status-graphic-success);
  }
}

.app-steps.is-finish-finish .app-steps__item.is-completed {
  .app-steps__indicator {
    background: var(--primary-subtle);
    border-color: var(--primary-solid);
    color: var(--primary-text);
  }

  .app-steps__line {
    background: var(--primary-solid);
  }
}
</style>
