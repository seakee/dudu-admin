<script setup lang="ts">
import { computed } from 'vue'
import { useTagsViewStore } from '@/stores'

const tagsViewStore = useTagsViewStore()
const cachedViews = computed(() => tagsViewStore.cachedViews)
</script>

<template>
  <section class="app-main">
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
  </section>
</template>

<style lang="scss" scoped>
.app-main {
  height: calc(100vh - 100px);
  width: 100%;
  position: relative;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: var(--app-gap);
  margin-top: 100px;
  background-color: transparent;
}
</style>
