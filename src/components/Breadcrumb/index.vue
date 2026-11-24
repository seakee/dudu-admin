<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationMatched } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta && (item.meta.titleKey || item.meta.title))
  return matched.filter(
    (item) => item.meta && (item.meta.titleKey || item.meta.title) && item.meta.breadcrumb !== false
  )
})

function handleLink(item: RouteLocationMatched) {
  const { redirect, path } = item
  if (redirect && typeof redirect === 'string') {
    router.push(redirect)
    return
  }
  router.push(path)
}

function getItemHref(item: RouteLocationMatched): string {
  if (item.redirect && typeof item.redirect === 'string' && item.redirect !== 'noRedirect') {
    return item.redirect
  }
  return item.path
}

function getItemTitle(item: RouteLocationMatched): string {
  const titleKey = item.meta?.titleKey as string | undefined
  if (titleKey) {
    return t(titleKey)
  }
  return String(item.meta?.title || '')
}

function getBreadcrumbKey(item: RouteLocationMatched, index: number) {
  return `${String(item.name || 'route')}:${item.path}:${index}`
}
</script>

<template>
  <nav
    class="app-breadcrumb"
    aria-label="Breadcrumb"
  >
    <TransitionGroup
      name="breadcrumb"
      tag="ol"
      class="app-breadcrumb__list"
    >
      <li
        v-for="(item, index) in breadcrumbs"
        :key="getBreadcrumbKey(item, index)"
        class="app-breadcrumb__item"
      >
        <span
          v-if="index > 0"
          class="app-breadcrumb__separator"
          aria-hidden="true"
        >
          /
        </span>
        <span
          v-if="item.redirect === 'noRedirect' || index === breadcrumbs.length - 1"
          class="no-redirect"
          :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined"
        >
          {{ getItemTitle(item) }}
        </span>
        <a
          v-else
          class="app-breadcrumb__link"
          :href="getItemHref(item)"
          @click.prevent="handleLink(item)"
        >
          {{ getItemTitle(item) }}
        </a>
      </li>
    </TransitionGroup>
  </nav>
</template>

<style lang="scss" scoped>
.app-breadcrumb {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  height: var(--navbar-height);
  margin-left: 8px;
  font-size: 14px;

  @include mobile {
    margin-left: 4px;
  }
}

.app-breadcrumb__list {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.app-breadcrumb__item {
  display: inline-flex;
  align-items: center;
  min-width: 0;

  &:not(:last-child) {
    flex-shrink: 0;

    @include mobile {
      display: none;
    }
  }

  @include mobile {
    &:last-child .app-breadcrumb__separator {
      display: none;
    }
  }
}

.app-breadcrumb__separator {
  flex-shrink: 0;
  margin: 0 8px;
  color: var(--text-tertiary);
  font-weight: 400;
}

.app-breadcrumb__link {
  color: var(--text-tertiary);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: var(--primary-text);
  }

  &:focus-visible {
    outline: 2px solid var(--app-input-border-focus);
    outline-offset: 2px;
    border-radius: var(--app-radius-xs);
  }
}

.no-redirect {
  color: var(--text-primary);
  font-weight: 600;
  cursor: text;
  @include text-ellipsis;
}
</style>
