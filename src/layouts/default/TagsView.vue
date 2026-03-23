<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsViewStore } from '@/stores'
import type { RouteLocationNormalized } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()
const { t } = useI18n()

const visitedViews = computed(() => tagsViewStore.visitedViews)

const isActive = (view: { path: string }) => {
  return view.path === route.path
}

const isAffix = (view: { affix?: boolean }) => {
  return view.affix
}

function addTags() {
  if (route.name) {
    tagsViewStore.addView(route as RouteLocationNormalized)
    tagsViewStore.updateVisitedView(route as RouteLocationNormalized)
  }
}

function syncTagTitleByPath(path: string) {
  const resolvedRoute = router.resolve(path)
  if (!resolvedRoute.matched.length) {
    return
  }

  tagsViewStore.updateVisitedView(resolvedRoute as unknown as RouteLocationNormalized)
}

function syncVisitedViewTitles() {
  visitedViews.value.forEach((view) => {
    syncTagTitleByPath(view.path)
  })
}

function isValidTagPath(path: string): boolean {
  const resolvedRoute = router.resolve(path)
  if (!resolvedRoute.matched.length) {
    return false
  }

  return resolvedRoute.matched.every((record) => record.path !== '/:pathMatch(.*)*')
}

function closeSelectedTag(view: { path: string; name: string }) {
  tagsViewStore.delView(view as unknown as RouteLocationNormalized)
  if (isActive(view)) {
    toLastView()
  }
}

function toLastView() {
  const latestView = visitedViews.value[visitedViews.value.length - 1]
  if (latestView) {
    router.push(latestView.path)
  } else {
    router.push('/')
  }
}

function handleScroll() {
  // 滚动逻辑
}

function getTagTitle(tag: { title: string; titleKey?: string }) {
  return tag.titleKey ? t(tag.titleKey) : tag.title
}

watch(route, () => {
  addTags()
})

onMounted(() => {
  tagsViewStore.pruneVisitedViews(isValidTagPath)
  syncVisitedViewTitles()
  addTags()
})
</script>

<template>
  <div class="tags-view-container">
    <el-scrollbar
      class="tags-view-wrapper"
      @scroll="handleScroll"
    >
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :to="tag.path"
        :class="['tags-view-item', { active: isActive(tag) }]"
        @click.middle="!isAffix(tag) && closeSelectedTag(tag)"
      >
        {{ getTagTitle(tag) }}
        <el-icon
          v-if="!isAffix(tag)"
          class="close-icon"
          @click.prevent.stop="closeSelectedTag(tag)"
        >
          <Close />
        </el-icon>
      </router-link>
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.tags-view-container {
  height: 50px;
  width: 100%;
  background: var(--app-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--app-border);
  box-shadow: var(--app-shadow-soft);

  .tags-view-wrapper {
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    width: 100%;

    :deep(.el-scrollbar__view) {
      display: flex;
      align-items: center;
      height: 100%;
    }

    .tags-view-item {
      display: inline-flex;
      align-items: center;
      height: 32px;
      line-height: 32px;
      padding: 0 12px;
      margin: 8px 0 8px 8px;
      border: 1px solid var(--app-border);
      color: var(--app-text-regular);
      background: var(--app-surface-muted);
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      border-radius: 4px;
      transition: all 0.3s;

      &:hover {
        background: var(--app-accent-soft);
        color: var(--app-text-primary);
      }

      &:first-of-type {
        margin-left: 10px;
      }

      &:last-of-type {
        margin-right: 10px;
      }

      &.active {
        background: var(--primary-gradient);
        color: #fff;
        border-color: transparent;

        html.dark & {
          background: var(--el-color-primary-light-3);
          border-color: var(--el-color-primary-light-3);
        }

        &::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-right: 4px;
          background: #fff;
          border-radius: 50%;
        }
      }

      .close-icon {
        width: 16px;
        height: 16px;
        margin-left: 4px;
        border-radius: 50%;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background-color: rgba(102, 126, 234, 0.2);
          color: #fff;
        }
      }
    }
  }
}
</style>
