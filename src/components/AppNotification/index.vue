<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationStore, type NotificationItem, type NotificationType } from '@/stores/notification'

interface AnimatedNotification extends NotificationItem {
  isExiting?: boolean
}

const EXIT_ANIMATION_MS = 220

const { t } = useI18n()
const notificationStore = useNotificationStore()

const animatedNotifications = ref<AnimatedNotification[]>([])
const expanded = ref(false)
const exitTimers = new Map<string, ReturnType<typeof setTimeout>>()
let prevNotifications: NotificationItem[] = []

function clearExitTimer(id: string) {
  const timerId = exitTimers.get(id)
  if (timerId !== undefined) {
    clearTimeout(timerId)
    exitTimers.delete(id)
  }
}

watch(
  () => notificationStore.notifications,
  (current) => {
    const prevIds = new Set(prevNotifications.map((item) => item.id))
    const currentIds = new Set(current.map((item) => item.id))
    const incomingById = new Map(current.map((item) => [item.id, item]))
    const newItems = current.filter((item) => !prevIds.has(item.id))
    const removedIds = new Set(
      prevNotifications.filter((item) => !currentIds.has(item.id)).map((item) => item.id)
    )

    const remainingIds = new Set<string>()
    const updated = animatedNotifications.value.map((item) => {
      const latest = incomingById.get(item.id)
      if (latest) {
        clearExitTimer(item.id)
        remainingIds.add(item.id)
        return { ...latest, isExiting: false }
      }
      if (removedIds.has(item.id)) {
        return { ...item, isExiting: true }
      }
      return item
    })

    newItems.forEach((item) => {
      if (!remainingIds.has(item.id)) {
        clearExitTimer(item.id)
        updated.push({ ...item, isExiting: false })
      }
    })

    const activeOrder = new Map(current.map((item, index) => [item.id, index]))
    animatedNotifications.value = updated
      .filter((item) => currentIds.has(item.id) || item.isExiting)
      .sort((a, b) => {
        const indexA = activeOrder.get(a.id)
        const indexB = activeOrder.get(b.id)
        if (indexA !== undefined && indexB !== undefined) {
          return indexA - indexB
        }
        return 0
      })

    if (removedIds.size > 0) {
      removedIds.forEach((id) => {
        clearExitTimer(id)
        const timerId = setTimeout(() => {
          exitTimers.delete(id)
          animatedNotifications.value = animatedNotifications.value.filter((item) => item.id !== id)
        }, EXIT_ANIMATION_MS)
        exitTimers.set(id, timerId)
      })
    }

    if (current.length <= 1) {
      expanded.value = false
      notificationStore.resumeTimers()
    }

    prevNotifications = current.map((item) => ({ ...item }))
  },
  { deep: true, immediate: true }
)

onUnmounted(() => {
  exitTimers.forEach((timerId) => clearTimeout(timerId))
  exitTimers.clear()
})

const orderedNotifications = computed(() => [...animatedNotifications.value].reverse())
const isStacked = computed(() => orderedNotifications.value.length > 1)
const isExpanded = computed(() => isStacked.value && expanded.value)
const hiddenCount = computed(() =>
  isStacked.value && !isExpanded.value ? orderedNotifications.value.length - 1 : 0
)

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'CircleCheck'
    case 'error':
      return 'CircleX'
    case 'warning':
      return 'TriangleExclamationPoint'
    default:
      return 'Info'
  }
}

function getStackLayerClass(index: number): string {
  if (isExpanded.value || !isStacked.value || index === 0) {
    return ''
  }
  if (index === 1) return 'is-peek-1'
  if (index === 2) return 'is-peek-2'
  return 'is-hidden-layer'
}

function handleClose(id: string) {
  animatedNotifications.value = animatedNotifications.value.map((item) =>
    item.id === id ? { ...item, isExiting: true } : item
  )
  clearExitTimer(id)
  const timerId = setTimeout(() => {
    exitTimers.delete(id)
    notificationStore.removeNotification(id)
    animatedNotifications.value = animatedNotifications.value.filter((item) => item.id !== id)
  }, EXIT_ANIMATION_MS)
  exitTimers.set(id, timerId)
}

function handleClearAll() {
  expanded.value = false
  notificationStore.clearAll()
}

function handleExpandStack() {
  notificationStore.pauseTimers()
  expanded.value = true
}

function handleMouseEnter() {
  notificationStore.pauseTimers()
  if (animatedNotifications.value.length > 1) {
    expanded.value = true
  }
}

function handleMouseLeave() {
  expanded.value = false
  notificationStore.resumeTimers()
}

function handleFocusIn() {
  notificationStore.pauseTimers()
  if (animatedNotifications.value.length > 1) {
    expanded.value = true
  }
}

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null
  const currentTarget = event.currentTarget as HTMLElement | null
  if (nextTarget && currentTarget?.contains(nextTarget)) {
    return
  }
  expanded.value = false
  notificationStore.resumeTimers()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClearAll()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="orderedNotifications.length > 0"
      class="notification-container"
      :class="{ 'is-stacked': isStacked, 'is-expanded': isExpanded }"
      data-testid="notification-container"
      role="region"
      aria-live="polite"
    >
      <div
        class="notification-stack"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @focusin="handleFocusIn"
        @focusout="handleFocusOut"
        @keydown="handleKeyDown"
      >
        <div
          v-for="(notification, index) in orderedNotifications"
          :key="notification.id"
          class="notification"
          :class="[
            notification.type,
            notification.isExiting ? 'exiting' : 'entering',
            index === 0 ? 'is-front' : '',
            getStackLayerClass(index)
          ]"
          :data-testid="`notification-item-${notification.id}`"
        >
          <span
            class="notification-icon"
            aria-hidden="true"
          >
            <AppIcon
              :name="getNotificationIcon(notification.type)"
              :size="15"
            />
          </span>
          <div class="message">
            {{ notification.message }}
          </div>
          <span
            v-if="notification.count > 1"
            class="notification-repeat-badge"
            data-testid="notification-repeat-badge"
          >
            ×{{ notification.count }}
          </span>
          <button
            v-if="index === 0 && hiddenCount > 0"
            type="button"
            class="notification-stack-more"
            data-testid="notification-stack-more"
            :aria-label="t('common.expandMore', { count: hiddenCount })"
            @click="handleExpandStack"
          >
            +{{ hiddenCount }}
          </button>
          <button
            type="button"
            class="close-btn"
            :aria-label="t('common.close')"
            @click="handleClose(notification.id)"
          >
            <AppIcon
              name="X"
              :size="14"
            />
          </button>
        </div>

        <div
          v-if="isExpanded"
          class="notification-stack-toolbar"
          data-testid="notification-stack-toolbar"
        >
          <button
            type="button"
            class="notification-clear-all"
            data-testid="notification-clear-all"
            @click="handleClearAll"
          >
            {{ t('common.clearAll') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@keyframes cpamp-notification-pill-enter {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cpamp-notification-pill-exit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
}

.notification-container:not(.is-expanded) .notification-stack {
  gap: 0;
}

.notification-container .notification {
  &.entering {
    animation: cpamp-notification-pill-enter 0.22s ease-out forwards;
  }

  &.exiting {
    animation: cpamp-notification-pill-exit 0.22s ease-in forwards;
  }

  &.is-peek-1 {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    transform-origin: bottom center;
    transform: translateY(5px) scale(0.96);
    opacity: 0.92;
  }

  &.is-peek-2 {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    transform-origin: bottom center;
    transform: translateY(10px) scale(0.92);
    opacity: 0.78;
  }

  &.is-hidden-layer {
    display: none;
  }
}

.notification-container.is-expanded .notification {
  position: relative;
  pointer-events: auto;
  transform: none;
  opacity: 1;
}
</style>
