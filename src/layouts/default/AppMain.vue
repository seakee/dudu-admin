<script setup lang="ts">
import { computed } from 'vue'
import { useTagsViewStore } from '@/stores'

const tagsViewStore = useTagsViewStore()
const cachedViews = computed(() => tagsViewStore.cachedViews)
</script>

<template>
  <section class="app-main">
    <div class="app-main__inner">
      <div class="app-main__view">
        <router-view v-slot="{ Component, route }">
          <transition
            name="fade-transform"
            mode="out-in"
          >
            <keep-alive :include="cachedViews">
              <component
                :is="Component"
                :key="route.path"
              />
            </keep-alive>
          </transition>
        </router-view>
      </div>
      <AppFooter />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.app-main {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  background-color: transparent;

  @supports (height: 100dvh) {
    height: 100dvh;
  }
}

.app-main__inner {
  min-height: 100%;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--app-gap);
  padding: calc(var(--shell-header-height, var(--navbar-height)) + var(--app-gap)) var(--app-gap)
    calc(12px + var(--page-floating-dock-height, 0px) + env(safe-area-inset-bottom));
  transition: padding-top 0.2s ease;

  @include mobile {
    padding-left: 12px;
    padding-right: 12px;
  }
}

.app-main__view {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
