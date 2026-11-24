<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWindowSize } from '@vueuse/core'
import { useAppStore } from '@/stores'
import Sidebar from './Sidebar.vue'
import Navbar from './Navbar.vue'
import TagsView from './TagsView.vue'
import AppMain from './AppMain.vue'

const MOBILE_BREAKPOINT = 768

const route = useRoute()
const appStore = useAppStore()
const { width } = useWindowSize()

const mainContainerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const classObj = computed(() => ({
  hideSidebar: !appStore.sidebar.opened,
  openSidebar: appStore.sidebar.opened,
  withoutAnimation: appStore.sidebar.withoutAnimation,
  mobile: appStore.device === 'mobile',
  'has-tags-view': appStore.tagsView
}))

function updateContentCenter() {
  if (typeof document === 'undefined') {
    return
  }
  const el = mainContainerRef.value
  if (!el) {
    return
  }
  const rect = el.getBoundingClientRect()
  const centerX = Math.round((rect.left + rect.width / 2) * 100) / 100
  document.documentElement.style.setProperty('--content-center-x', `${centerX}px`)
}

function handleCloseSidebar() {
  appStore.closeSidebar(false)
}

function handleMainTransitionEnd(event: TransitionEvent) {
  if (event.target === mainContainerRef.value && event.propertyName === 'margin-left') {
    updateContentCenter()
  }
}

watch(
  width,
  (currentWidth) => {
    const isMobileViewport = currentWidth <= MOBILE_BREAKPOINT
    const nextDevice = isMobileViewport ? 'mobile' : 'desktop'
    if (appStore.device !== nextDevice) {
      appStore.toggleDevice(nextDevice)
      if (isMobileViewport && appStore.sidebar.opened) {
        appStore.closeSidebar(true)
      }
    }
    void nextTick(updateContentCenter)
  },
  { immediate: true }
)

watch(
  () => route.path,
  () => {
    if (appStore.device === 'mobile' && appStore.sidebar.opened) {
      appStore.closeSidebar(false)
    }
  }
)

watch(
  () => [appStore.sidebar.opened, appStore.device],
  () => {
    void nextTick(updateContentCenter)
  }
)

onMounted(() => {
  updateContentCenter()
  if (typeof ResizeObserver !== 'undefined' && mainContainerRef.value) {
    resizeObserver = new ResizeObserver(updateContentCenter)
    resizeObserver.observe(mainContainerRef.value)
  }
  window.addEventListener('resize', updateContentCenter)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', updateContentCenter)
  if (typeof document !== 'undefined') {
    document.documentElement.style.removeProperty('--content-center-x')
  }
})
</script>

<template>
  <div
    :class="classObj"
    class="app-wrapper"
  >
    <button
      v-if="appStore.device === 'mobile' && appStore.sidebar.opened"
      type="button"
      class="sidebar-backdrop"
      aria-label="Close navigation"
      @click="handleCloseSidebar"
    />
    <Sidebar class="sidebar-container" />
    <div
      ref="mainContainerRef"
      class="main-container"
      @transitionend="handleMainTransitionEnd"
    >
      <div
        class="fixed-header"
        :class="{ 'has-tags-view': appStore.tagsView }"
      >
        <Navbar />
        <TagsView v-if="appStore.tagsView" />
      </div>
      <AppMain />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-wrapper {
  --sidebar-active-width: var(--sidebar-width);
  --shell-header-height: var(--navbar-height);

  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;

  &.has-tags-view {
    --shell-header-height: calc(var(--navbar-height) + var(--tags-view-height));
  }

  &.hideSidebar {
    --sidebar-active-width: var(--sidebar-collapsed-width);
  }

  &.mobile,
  &.mobile.hideSidebar {
    --sidebar-active-width: 0px;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border: 0;
    padding: 0;
    margin: 0;
    background: var(--overlay-scrim-backdrop);
    cursor: pointer;
    transition: opacity $transition-fast;
  }

  .sidebar-container {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1001;
    width: var(--sidebar-active-width);
    height: 100%;
    overflow: hidden;
    transition:
      width 0.28s ease,
      transform 0.28s ease,
      visibility 0s linear 0s;
    background: var(--sidebar-bg-color);
    backdrop-filter: var(--glass-backdrop-filter);
    -webkit-backdrop-filter: var(--glass-backdrop-filter);
    box-shadow: none;
  }

  .main-container {
    min-height: 100%;
    margin-left: var(--sidebar-active-width);
    transition: margin-left 0.28s ease;
    position: relative;
    z-index: 1;
  }

  .fixed-header {
    position: fixed;
    top: 0;
    right: 0;
    left: var(--sidebar-active-width);
    z-index: 100;
    transition: left 0.28s ease;
  }

  &.mobile {
    .sidebar-container {
      width: var(--sidebar-width);
      /* floating layer: elevation allowed */
      box-shadow: var(--floating-shadow-lg);
    }

    &.hideSidebar {
      .sidebar-container {
        pointer-events: none;
        visibility: hidden;
        transform: translateX(-100%);
        box-shadow: none;
        transition:
          transform 0.28s ease,
          visibility 0s linear 0.28s;
      }
    }
  }

  &.withoutAnimation {
    .sidebar-container,
    .main-container,
    .fixed-header {
      transition: none;
    }
  }
}
</style>
