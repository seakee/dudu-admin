<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'

type ThemeValue = 'light' | 'dark' | 'auto'
type ThemeDropdownCommand = ThemeValue | 'toggle-visual-effects' | 'toggle-tags-view'

interface DropdownItem {
  key: string
  label?: string
  icon?: string
  disabled?: boolean
  tone?: 'default' | 'danger'
  divided?: boolean
  active?: boolean
}

const appStore = useAppStore()
const { t } = useI18n()

const themeOptions = computed<Array<{ label: string; value: ThemeValue; icon: string }>>(() => [
  { label: t('theme.light'), value: 'light', icon: 'Sun' },
  { label: t('theme.dark'), value: 'dark', icon: 'Moon' },
  { label: t('theme.auto'), value: 'auto', icon: 'Monitor' }
])

const currentTheme = computed(() => appStore.theme)
const isReducedVisualEffects = computed(() => appStore.visualEffects === 'reduced')
const isTagsViewEnabled = computed(() => appStore.tagsView)

const currentIcon = computed(() => {
  const option = themeOptions.value.find((opt) => opt.value === currentTheme.value)
  return option ? option.icon : 'Sun'
})

const dropdownItems = computed<DropdownItem[]>(() => [
  ...themeOptions.value.map((item) => ({
    key: item.value,
    label: item.label,
    icon: item.icon,
    active: currentTheme.value === item.value
  })),
  {
    key: 'toggle-visual-effects',
    label: t('theme.visualEffects'),
    icon: 'Sparkles',
    divided: true,
    active: isReducedVisualEffects.value
  },
  {
    key: 'toggle-tags-view',
    label: t('theme.tagsView'),
    icon: 'Tags',
    active: isTagsViewEnabled.value
  }
])

function handleCommand(key: string) {
  const command = key as ThemeDropdownCommand
  if (command === 'toggle-visual-effects') {
    appStore.toggleVisualEffects()
    return
  }
  if (command === 'toggle-tags-view') {
    appStore.toggleTagsView()
    return
  }
  appStore.setTheme(command)
}
</script>

<template>
  <AppDropdown
    :items="dropdownItems"
    placement="bottom-end"
    :aria-label="t('theme.tooltip')"
    @select="handleCommand"
  >
    <template #trigger>
      <AppTooltip
        :content="t('theme.tooltip')"
        placement="bottom"
      >
        <button
          type="button"
          class="theme-select-container"
          :aria-label="t('theme.tooltip')"
        >
          <span class="theme-select-trigger">
            <AppIcon
              :name="currentIcon"
              :size="18"
            />
          </span>
        </button>
      </AppTooltip>
    </template>
  </AppDropdown>
</template>

<style lang="scss" scoped>
.theme-select-container {
  @include button-reset;
  width: var(--floating-control-size);
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
  }
}

.theme-select-trigger {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
