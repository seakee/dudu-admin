<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import en from 'element-plus/es/locale/lang/en'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import { getAppName } from '@/utils/app'

const appStore = useAppStore()
const route = useRoute()
const { t } = useI18n()

useTheme()

const elementLocale = computed(() => (appStore.locale === 'zh-CN' ? zhCn : en))

const pageTitle = computed(() => {
  const titleKey = route.meta?.titleKey as string | undefined
  const rawTitle = route.meta?.title as string | undefined
  const title = titleKey ? t(titleKey) : rawTitle
  const appName = getAppName(t('app.name'))
  return title ? `${title} - ${appName}` : appName
})

watch(
  pageTitle,
  (title) => {
    document.title = title
  },
  { immediate: true }
)
</script>

<template>
  <ElConfigProvider
    :locale="elementLocale"
    :size="appStore.size"
  >
    <div class="app-shell">
      <AppBackground />
      <div class="app-content">
        <router-view />
      </div>
    </div>
  </ElConfigProvider>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100%;
  width: 100%;
}

.app-content {
  position: relative;
  z-index: 1;
  min-height: 100%;
}
</style>
