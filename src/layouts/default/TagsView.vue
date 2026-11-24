<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsViewStore } from '@/stores'
import type { RouteLocationNormalized } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { resolveRouteTitleKeyByPath } from '@/router/routeTitleKey'

const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()
const { t } = useI18n()

const scrollWrapperRef = ref<HTMLElement | null>(null)
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

function handleWheel(event: WheelEvent) {
  const container = scrollWrapperRef.value
  if (!container) return
  const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX
  if (delta !== 0) {
    container.scrollLeft += delta
  }
}

function getTagTitle(tag: { path: string; title: string; titleKey?: string }) {
  const key = tag.titleKey || resolveRouteTitleKeyByPath(tag.path)
  return key ? t(key) : tag.title
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
    <div
      ref="scrollWrapperRef"
      class="tags-view-wrapper"
      @wheel.prevent="handleWheel"
    >
      <div class="tags-view-track">
        <div
          v-for="tag in visitedViews"
          :key="tag.path"
          :class="['tags-view-item', { active: isActive(tag) }]"
          @click.middle="!isAffix(tag) && closeSelectedTag(tag)"
        >
          <router-link
            :to="tag.path"
            class="tags-view-item__link"
          >
            {{ getTagTitle(tag) }}
          </router-link>
          <button
            v-if="!isAffix(tag)"
            type="button"
            class="close-icon"
            :aria-label="t('common.close')"
            @click.stop="closeSelectedTag(tag)"
          >
            <AppIcon
              name="X"
              :size="11"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tags-view-container {
  height: var(--tags-view-height);
  width: 100%;
  background: color-mix(in srgb, var(--app-surface) 88%, transparent);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  border-bottom: 1px solid var(--border-color);
  box-shadow: none;

  .tags-view-wrapper {
    white-space: nowrap;
    position: relative;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    width: 100%;
    height: 100%;

    &::-webkit-scrollbar {
      display: none;
    }

    .tags-view-track {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 100%;
      height: 100%;
      padding: 0 12px;
    }

    .tags-view-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 26px;
      line-height: 1;
      padding: 0 10px;
      border-radius: var(--app-radius-xs);
      border: 1px solid var(--border-subtle);
      background: var(--surface-subtle);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      user-select: none;
      transition:
        background-color $transition-fast,
        border-color $transition-fast,
        color $transition-fast;

      &:hover:not(.active) {
        background: var(--surface-subtle-hover);
        border-color: var(--border-hover);
        color: var(--text-primary);
      }

      &:has(.tags-view-item__link:focus-visible) {
        outline: 2px solid var(--app-input-border-focus);
        outline-offset: 1px;
      }

      &.active {
        background: var(--primary-subtle);
        border-color: var(--data-badge-info-border);
        color: var(--primary-text);
        font-weight: 600;

        &::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--primary-color);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .close-icon {
          color: var(--primary-text);
        }
      }

      .tags-view-item__link {
        display: inline-flex;
        align-items: center;
        height: 100%;
        color: inherit;
        text-decoration: none;

        &:focus {
          outline: none;
        }
      }

      .close-icon {
        @include button-reset;
        width: 14px;
        height: 14px;
        margin-left: 2px;
        border-radius: 50%;
        color: var(--text-tertiary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition:
          background-color $transition-fast,
          color $transition-fast;

        &:hover {
          background-color: var(--app-accent-soft);
          color: var(--primary-text);
        }
      }
    }
  }
}
</style>
