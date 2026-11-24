<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores'
import { type Locale } from '@/i18n'
import { useI18n } from 'vue-i18n'

interface DropdownItem {
  key: string
  label?: string
  icon?: string
  disabled?: boolean
  tone?: 'default' | 'danger'
  divided?: boolean
  active?: boolean
}

const props = defineProps<{
  iconOnly?: boolean
}>()

const appStore = useAppStore()
const { t } = useI18n()

const localeOptions = computed(() => [
  { label: t('localeSwitch.en'), value: 'en-US' },
  { label: t('localeSwitch.zh'), value: 'zh-CN' }
])

const currentLocale = computed(() => appStore.locale)
const isIconOnly = computed(() => props.iconOnly === true)
const currentLabel = computed(() => {
  const match = localeOptions.value.find((item) => item.value === currentLocale.value)
  return match ? match.label : currentLocale.value
})

const dropdownItems = computed<DropdownItem[]>(() =>
  localeOptions.value.map((item) => ({
    key: item.value,
    label: item.label,
    active: currentLocale.value === item.value
  }))
)

function handleSetLocale(locale: string) {
  appStore.setLocale(locale as Locale)
}
</script>

<template>
  <AppDropdown
    :items="dropdownItems"
    placement="bottom-end"
    :aria-label="t('localeSwitch.tooltip')"
    @select="handleSetLocale"
  >
    <template #trigger>
      <AppTooltip
        :content="t('localeSwitch.tooltip')"
        placement="bottom"
      >
        <button
          type="button"
          class="locale-select-container"
          :class="{ 'icon-only': isIconOnly }"
          :aria-label="t('localeSwitch.tooltip')"
        >
          <span class="locale-select-trigger">
            <span
              v-if="!isIconOnly"
              class="locale-label"
            >
              {{ currentLabel }}
            </span>
            <AppIcon
              v-else
              name="Globe"
              :size="18"
              class="locale-icon"
            />
          </span>
        </button>
      </AppTooltip>
    </template>
  </AppDropdown>
</template>

<style lang="scss" scoped>
.locale-select-container {
  @include button-reset;
  height: var(--floating-control-size);
  padding: 0;
  border-radius: var(--app-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: transparent;
  transition:
    background-color $transition-fast,
    color $transition-fast;

  &:hover {
    background: var(--app-accent-soft);
    color: var(--primary-text);

    .locale-label {
      color: var(--primary-text);
    }
  }

  &.icon-only {
    width: var(--floating-control-size);

    .locale-select-trigger {
      padding: 0;
    }
  }
}

.locale-select-trigger {
  width: 100%;
  height: 100%;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.locale-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.2px;
  transition: color $transition-fast;
}

.locale-icon {
  color: inherit;
}
</style>
