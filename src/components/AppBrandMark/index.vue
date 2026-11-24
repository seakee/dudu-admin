<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAppName } from '@/utils/app'

const props = withDefaults(
  defineProps<{
    layout?: 'stacked' | 'inline'
    collapsed?: boolean
    subtitle?: string
    name?: string
  }>(),
  {
    layout: 'stacked',
    collapsed: false,
    subtitle: '',
    name: undefined
  }
)

const { t } = useI18n()

const appName = computed(() => {
  const customName = props.name?.trim()
  if (customName) {
    return customName
  }

  return getAppName(t('app.name'))
})

const initialLetter = computed(() => appName.value.trim().charAt(0).toUpperCase() || 'A')
</script>

<template>
  <div
    class="app-brand-mark"
    :class="[
      `app-brand-mark--${props.layout}`,
      { 'is-collapsed': props.layout === 'inline' && props.collapsed }
    ]"
  >
    <span
      class="app-brand-mark__badge"
      aria-hidden="true"
    >
      {{ initialLetter }}
    </span>
    <h1
      v-show="props.layout !== 'inline' || !props.collapsed"
      class="app-brand-mark__title"
    >
      {{ appName }}
    </h1>
    <p
      v-if="props.layout === 'stacked' && props.subtitle"
      class="app-brand-mark__subtitle"
    >
      {{ props.subtitle }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.app-brand-mark {
  min-width: 0;
}

.app-brand-mark__badge {
  background: var(--primary-solid);
  color: var(--primary-contrast);
  box-shadow: var(--app-specular-highlight);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  user-select: none;
}

.app-brand-mark__title {
  margin: 0;
  color: var(--text-primary);
}

.app-brand-mark--stacked {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .app-brand-mark__badge {
    width: 44px;
    height: 44px;
    border-radius: var(--app-radius-md);
    font-size: 20px;
    margin-bottom: 12px;
  }

  .app-brand-mark__title {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: 0.2px;
  }

  .app-brand-mark__subtitle {
    margin: 6px 0 0;
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--text-secondary);
  }
}

.app-brand-mark--inline {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;

  .app-brand-mark__badge {
    width: 30px;
    height: 30px;
    border-radius: var(--app-radius-sm);
    font-size: 14px;
  }

  .app-brand-mark__title {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    @include text-ellipsis;
  }

  &.is-collapsed {
    justify-content: center;
    gap: 0;
  }
}
</style>
