<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores'
import { type Locale } from '@/i18n'
import { useI18n } from 'vue-i18n'

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
  const match = localeOptions.value.find(item => item.value === currentLocale.value)
  return match ? match.label : currentLocale.value
})

function handleSetLocale(locale: string) {
  appStore.setLocale(locale as Locale)
}
</script>

<template>
  <el-dropdown
    trigger="click"
    @command="handleSetLocale"
  >
    <div
      class="locale-select-container"
      :class="{ 'icon-only': isIconOnly }"
    >
      <el-tooltip
        :content="t('localeSwitch.tooltip')"
        placement="bottom"
      >
        <template v-if="!isIconOnly">
          <span class="locale-label">{{ currentLabel }}</span>
        </template>
        <template v-else>
          <el-icon
            :size="20"
            class="locale-icon"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <path
                d="M3 12h18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
              <path
                d="M12 3c3.5 3.8 3.5 13.2 0 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
              <path
                d="M12 3c-3.5 3.8-3.5 13.2 0 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </el-icon>
        </template>
      </el-tooltip>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in localeOptions"
          :key="item.value"
          :command="item.value"
          :disabled="currentLocale === item.value"
        >
          {{ item.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
.locale-select-container {
  padding: 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 100%;
  transition: background 0.3s;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
}

.locale-select-container.icon-only {
  padding: 0 10px;
}

.locale-label {
  font-size: 13px;
  color: #5a5e66;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.locale-icon {
  color: inherit;
}

:show-active-dark .locale-select-container:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
