<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationMatched } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const breadcrumbs = computed(() => {
  // get matched routes
  let matched = route.matched.filter(item => item.meta && item.meta.title)
  const first = matched[0]

  if (!isDashboard(first)) {
    // optional: add dashboard as home
    // matched = [{ path: '/dashboard', meta: { title: '首页' } } as any].concat(matched)
  }

  return matched.filter(item => item.meta && (item.meta.titleKey || item.meta.title) && item.meta.breadcrumb !== false)
})

function isDashboard(route: RouteLocationMatched) {
  const name = route && route.name
  if (!name) {
    return false
  }
  return name.toString().trim().toLocaleLowerCase() === 'dashboard'
}

function handleLink(item: any) {
  const { redirect, path } = item
  if (redirect) {
    router.push(redirect)
    return
  }
  router.push(path)
}

function getBreadcrumbKey(item: RouteLocationMatched, index: number) {
  return `${String(item.name || 'route')}:${item.path}:${index}`
}
</script>

<template>
  <el-breadcrumb
    class="app-breadcrumb"
    separator="/"
  >
    <transition-group name="breadcrumb">
      <el-breadcrumb-item
        v-for="(item, index) in breadcrumbs"
        :key="getBreadcrumbKey(item, index)"
      >
        <span
          v-if="item.redirect === 'noRedirect' || index == breadcrumbs.length - 1"
          class="no-redirect"
        >
          {{ item.meta.titleKey ? t(item.meta.titleKey) : item.meta.title }}
        </span>
        <a
          v-else
          @click.prevent="handleLink(item)"
        >
          {{ item.meta.titleKey ? t(item.meta.titleKey) : item.meta.title }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<style lang="scss" scoped>
.app-breadcrumb.el-breadcrumb {
  display: inline-block;
  font-size: 14px;
  line-height: 50px;
  margin-left: 8px;

  .no-redirect {
    color: #97a8be;
    cursor: text;
  }
}
</style>
