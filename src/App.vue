<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import { useVisualEffects } from '@/composables/useVisualEffects'
import { getAppName } from '@/utils/app'
import AppBackground from '@/components/AppBackground/index.vue'
import AppNotification from '@/components/AppNotification/index.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog/index.vue'

const appStore = useAppStore()
const route = useRoute()
const { t } = useI18n()

useTheme()
useVisualEffects()

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

watch(
  () => appStore.locale,
  (locale) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="app-shell">
    <AppBackground />
    <div class="app-content">
      <router-view />
    </div>
    <AppNotification />
    <AppConfirmDialog />
  </div>
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
