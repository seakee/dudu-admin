<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores'
import { useI18n } from 'vue-i18n'

const appStore = useAppStore()
const { t } = useI18n()

const themeOptions = computed(() => [
  { label: t('theme.light'), value: 'light', icon: 'Sunny' },
  { label: t('theme.dark'), value: 'dark', icon: 'Moon' },
  { label: t('theme.auto'), value: 'auto', icon: 'Monitor' }
])

const currentTheme = computed(() => appStore.theme)

function handleSetTheme(theme: 'light' | 'dark' | 'auto') {
  appStore.setTheme(theme)
}

const currentIcon = computed(() => {
  const option = themeOptions.value.find(opt => opt.value === currentTheme.value)
  return option ? option.icon : 'Sunny'
})
</script>

<template>
  <el-dropdown
    trigger="click"
    @command="handleSetTheme"
  >
    <div class="theme-select-container">
      <el-tooltip
        :content="t('theme.tooltip')"
        placement="bottom"
      >
        <el-icon :size="20">
          <component :is="currentIcon" />
        </el-icon>
      </el-tooltip>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in themeOptions"
          :key="item.value"
          :command="item.value"
          :disabled="currentTheme === item.value"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          {{ item.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
.theme-select-container {
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

:show-active-dark .theme-select-container:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
