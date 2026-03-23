<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores'
import Sidebar from './Sidebar.vue'
import Navbar from './Navbar.vue'
import TagsView from './TagsView.vue'
import AppMain from './AppMain.vue'

const appStore = useAppStore()

const classObj = computed(() => ({
  hideSidebar: !appStore.sidebar.opened,
  openSidebar: appStore.sidebar.opened,
  withoutAnimation: appStore.sidebar.withoutAnimation,
  mobile: appStore.device === 'mobile'
}))
</script>

<template>
  <div
    :class="classObj"
    class="app-wrapper"
  >
    <Sidebar class="sidebar-container" />
    <div class="main-container">
      <div class="fixed-header">
        <Navbar />
        <TagsView />
      </div>
      <AppMain />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;

  // Background Layer
  .sidebar-container {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1001;
    width: var(--sidebar-width);
    height: 100%;
    overflow: hidden;
    transition: width 0.28s;
    
    // Glassmorphism
    background: var(--sidebar-bg-color);
    box-shadow: var(--sidebar-shadow);
  }

  .main-container {
    min-height: 100%;
    margin-left: var(--sidebar-width);
    transition: margin-left 0.28s;
    position: relative;
    z-index: 1; // Above background
  }

  .fixed-header {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 9;
    width: calc(100% - var(--sidebar-width));
    transition: width 0.28s;
  }

  &.hideSidebar {
    .sidebar-container {
      width: 54px;
    }

    .main-container {
      margin-left: 54px;
    }

    .fixed-header {
      width: calc(100% - 54px);
    }
  }

  &.mobile {
    .sidebar-container {
      transition: transform 0.28s;
      width: var(--sidebar-width);
    }

    .main-container {
      margin-left: 0;
    }

    .fixed-header {
      width: 100%;
    }

    &.hideSidebar {
      .sidebar-container {
        pointer-events: none;
        transform: translateX(calc(-1 * var(--sidebar-width)));
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
