<script setup lang="ts" generic="T extends string = string">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance
} from 'vue'
import type { SegmentedTabItem } from '@/components/types'

const props = withDefaults(
  defineProps<{
    modelValue: T
    items: ReadonlyArray<SegmentedTabItem<T>>
    ariaLabel?: string
    idBase?: string
    variant?: 'default' | 'joined'
    size?: 'md' | 'sm'
    roleMode?: 'tablist' | 'group'
    allowReselect?: boolean
    fullWidth?: boolean
    equalWidth?: boolean
    responsiveFullWidth?: boolean
    disabled?: boolean
  }>(),
  {
    ariaLabel: undefined,
    idBase: 'segmented-tabs',
    variant: 'default',
    size: 'md',
    roleMode: 'tablist',
    allowReselect: false,
    fullWidth: false,
    equalWidth: false,
    responsiveFullWidth: true,
    disabled: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: T]
  change: [value: T]
}>()

const rootRef = ref<HTMLDivElement | null>(null)
const itemRefs = new Map<T, HTMLElement>()
const scrollFade = ref<{ left: boolean; right: boolean }>({
  left: false,
  right: false
})

let resizeObserver: ResizeObserver | null = null

const isTablist = computed(() => props.roleMode === 'tablist')

const enabledItems = computed(() =>
  props.items.filter((item) => !props.disabled && !item.disabled)
)

const rootClasses = computed(() => [
  'segmented-tabs',
  {
    'is-joined': props.variant === 'joined',
    'is-size-sm': props.size === 'sm',
    'is-full-width': props.fullWidth,
    'is-equal-width': props.equalWidth,
    'is-responsive-full-width': props.responsiveFullWidth
  }
])

function updateScrollFade() {
  const el = rootRef.value
  if (!el) return
  const maxScrollLeft = el.scrollWidth - el.clientWidth
  const nextLeft = el.scrollLeft > 2
  const nextRight = maxScrollLeft > 2 && el.scrollLeft < maxScrollLeft - 2
  if (scrollFade.value.left !== nextLeft || scrollFade.value.right !== nextRight) {
    scrollFade.value = { left: nextLeft, right: nextRight }
  }
}

function setItemRef(id: T, el: Element | ComponentPublicInstance | null) {
  if (!el) {
    itemRefs.delete(id)
    return
  }
  const domEl =
    el instanceof HTMLElement
      ? el
      : ((el as ComponentPublicInstance).$el as HTMLElement | null)
  if (domEl instanceof HTMLElement) {
    itemRefs.set(id, domEl)
  }
}

function isItemDisabled(item: SegmentedTabItem<T>): boolean {
  return props.disabled || Boolean(item.disabled)
}

function hasCount(item: SegmentedTabItem<T>): boolean {
  return item.count !== undefined && item.count !== null && item.count !== ''
}

function selectItem(id: T, isActive: boolean) {
  if (!isActive || props.allowReselect) {
    emit('update:modelValue', id)
    emit('change', id)
  }
}

function handleButtonClick(event: MouseEvent, item: SegmentedTabItem<T>) {
  if (isItemDisabled(item)) {
    event.preventDefault()
    return
  }
  selectItem(item.id, item.id === props.modelValue)
}

function handleLinkClick(
  event: MouseEvent,
  item: SegmentedTabItem<T>,
  navigate: (e?: MouseEvent) => unknown
) {
  if (isItemDisabled(item)) {
    event.preventDefault()
    return
  }
  selectItem(item.id, item.id === props.modelValue)
  navigate(event)
}

function handleKeyDown(event: KeyboardEvent, currentId: T) {
  const list = enabledItems.value
  if (list.length === 0) return

  const currentIndex = list.findIndex((item) => item.id === currentId)
  if (currentIndex === -1) return

  let nextIndex = currentIndex
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      nextIndex = (currentIndex + 1) % list.length
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIndex = (currentIndex - 1 + list.length) % list.length
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = list.length - 1
      break
    default:
      return
  }

  event.preventDefault()
  const nextItem = list[nextIndex]
  if (!nextItem) return
  itemRefs.get(nextItem.id)?.focus()
  if (!nextItem.to) {
    selectItem(nextItem.id, nextItem.id === props.modelValue)
  }
}

onMounted(() => {
  updateScrollFade()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateScrollFade)
  }
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    resizeObserver = new ResizeObserver(updateScrollFade)
    resizeObserver.observe(rootRef.value)
  }
})

watch(
  [() => props.items, () => props.modelValue],
  () => {
    void nextTick(updateScrollFade)
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateScrollFade)
  }
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    ref="rootRef"
    :class="rootClasses"
    :role="isTablist ? 'tablist' : 'group'"
    :aria-label="props.ariaLabel"
    :data-variant="props.variant"
    :data-size="props.size"
    :data-scroll-left="scrollFade.left ? 'true' : undefined"
    :data-scroll-right="scrollFade.right ? 'true' : undefined"
    @scroll="updateScrollFade"
  >
    <template
      v-for="item in props.items"
      :key="item.id"
    >
      <router-link
        v-if="item.to && !isItemDisabled(item)"
        v-slot="{ href, navigate }"
        :to="item.to"
        custom
      >
        <a
          :id="isTablist ? `${props.idBase}-${item.id}` : undefined"
          :ref="(el) => setItemRef(item.id, el)"
          :href="href"
          class="segmented-tabs__item"
          :class="{
            'is-active': item.id === props.modelValue,
            'is-disabled': isItemDisabled(item)
          }"
          :role="isTablist ? 'tab' : undefined"
          :aria-label="item.ariaLabel"
          :aria-selected="isTablist ? item.id === props.modelValue : undefined"
          :aria-controls="isTablist ? item.ariaControls : undefined"
          :tabindex="isTablist ? (item.id === props.modelValue ? 0 : -1) : undefined"
          :title="item.title"
          @click="(event) => handleLinkClick(event, item, navigate)"
          @keydown="(event) => isTablist && handleKeyDown(event, item.id)"
        >
          <span class="segmented-tabs__label">
            {{ item.label }}
          </span>
          <span
            v-if="hasCount(item)"
            class="segmented-tabs__count"
          >
            {{ item.count }}
          </span>
        </a>
      </router-link>

      <button
        v-else
        :id="isTablist ? `${props.idBase}-${item.id}` : undefined"
        :ref="(el) => setItemRef(item.id, el)"
        type="button"
        class="segmented-tabs__item"
        :class="{
          'is-active': item.id === props.modelValue,
          'is-disabled': isItemDisabled(item)
        }"
        :role="isTablist ? 'tab' : undefined"
        :aria-label="item.ariaLabel"
        :aria-selected="isTablist ? item.id === props.modelValue : undefined"
        :aria-controls="isTablist ? item.ariaControls : undefined"
        :aria-pressed="!isTablist ? item.id === props.modelValue : undefined"
        :tabindex="
          isTablist
            ? item.id === props.modelValue && !isItemDisabled(item)
              ? 0
              : -1
            : undefined
        "
        :title="item.title"
        :disabled="isItemDisabled(item)"
        :aria-disabled="isItemDisabled(item) || undefined"
        @click="(event) => handleButtonClick(event, item)"
        @keydown="(event) => isTablist && handleKeyDown(event, item.id)"
      >
        <span class="segmented-tabs__label">
          {{ item.label }}
        </span>
        <span
          v-if="hasCount(item)"
          class="segmented-tabs__count"
        >
          {{ item.count }}
        </span>
      </button>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.segmented-tabs {
  box-sizing: border-box;
  display: inline-flex;
  align-items: stretch;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  min-height: 40px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  border-radius: var(--app-radius-md);
  background: color-mix(in srgb, var(--surface-subtle) 78%, var(--bg-primary));
  box-shadow: none;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }

  &[data-scroll-right='true']:not([data-scroll-left='true']) {
    -webkit-mask-image: linear-gradient(
      to right,
      var(--bg-primary) 0,
      var(--bg-primary) calc(100% - 24px),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      var(--bg-primary) 0,
      var(--bg-primary) calc(100% - 24px),
      transparent 100%
    );
  }

  &[data-scroll-left='true']:not([data-scroll-right='true']) {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      var(--bg-primary) 24px,
      var(--bg-primary) 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0,
      var(--bg-primary) 24px,
      var(--bg-primary) 100%
    );
  }

  &[data-scroll-left='true'][data-scroll-right='true'] {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      var(--bg-primary) 24px,
      var(--bg-primary) calc(100% - 24px),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0,
      var(--bg-primary) 24px,
      var(--bg-primary) calc(100% - 24px),
      transparent 100%
    );
  }

  &.is-full-width {
    width: 100%;
  }

  &.is-responsive-full-width {
    @include mobile {
      width: 100%;
    }
  }
}

.segmented-tabs__item {
  @include button-reset;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  min-height: var(--control-height-sm);
  min-width: 112px;
  padding: 0 15px;
  border-radius: var(--app-radius-sm);
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--text-secondary) 84%, var(--text-primary));
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover:not(.is-disabled) {
    color: var(--primary-text);
    background: color-mix(in srgb, var(--primary-color) 6%, var(--bg-primary));
  }

  &.is-active,
  &.is-active:hover:not(.is-disabled) {
    color: var(--primary-text);
    background: color-mix(in srgb, var(--bg-primary) 88%, var(--primary-color));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 16%, transparent);
    font-weight: 700;
  }

  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @include mobile {
    min-width: 0;
    padding: 0 11px;
    font-size: 12px;
  }
}

.segmented-tabs.is-equal-width .segmented-tabs__item {
  flex: 1 1 0;
  min-width: 0;
}

.segmented-tabs__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--app-radius-pill);
  background: color-mix(in srgb, var(--text-tertiary) 16%, transparent);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.segmented-tabs__item.is-active .segmented-tabs__count {
  background: color-mix(in srgb, var(--primary-color) 16%, transparent);
  color: var(--primary-text);
}

.segmented-tabs.is-joined {
  height: var(--control-height-sm);
  min-height: var(--control-height-sm);
  padding: 0;
  gap: 0;
  border-color: color-mix(in srgb, var(--border-color) 86%, transparent);
  border-radius: var(--app-radius-sm);
  background: color-mix(in srgb, var(--bg-primary) 82%, var(--surface-subtle));
  box-shadow: none;

  .segmented-tabs__item {
    min-width: 0;
    min-height: 100%;
    padding: 0 14px;
    border-radius: 0;
    color: color-mix(in srgb, var(--text-secondary) 84%, var(--text-primary));

    & + .segmented-tabs__item {
      border-left: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
    }

    &:first-child {
      border-start-start-radius: calc(var(--app-radius-sm) - 1px);
      border-end-start-radius: calc(var(--app-radius-sm) - 1px);
    }

    &:last-child {
      border-start-end-radius: calc(var(--app-radius-sm) - 1px);
      border-end-end-radius: calc(var(--app-radius-sm) - 1px);
    }

    &:hover:not(.is-disabled) {
      background: color-mix(in srgb, var(--primary-color) 5%, var(--bg-primary));
      color: var(--text-primary);
    }

    &.is-active,
    &.is-active:hover:not(.is-disabled) {
      border-left-color: transparent;
      background: color-mix(in srgb, var(--primary-color) 12%, var(--bg-primary));
      box-shadow: none;
      color: var(--primary-text);
    }

    &.is-active + .segmented-tabs__item {
      border-left-color: transparent;
    }
  }

  @include mobile {
    .segmented-tabs__item {
      padding-inline: 8px;
      font-size: 11.5px;
    }
  }
}

.segmented-tabs.is-size-sm {
  height: var(--control-height-xs);
  min-height: var(--control-height-xs);
  padding: 2px;
  gap: 2px;
  border-radius: var(--app-radius-sm);

  .segmented-tabs__item {
    min-width: 0;
    min-height: 0;
    height: 100%;
    padding: 0 11px;
    border-radius: var(--app-radius-xs);
    font-size: 12px;
    font-weight: 600;
  }

  .segmented-tabs__item.is-active,
  .segmented-tabs__item.is-active:hover:not(.is-disabled) {
    font-weight: 700;
  }
}

.segmented-tabs.is-joined.is-size-sm {
  height: var(--control-height-xs);
  min-height: var(--control-height-xs);
  padding: 0;
  gap: 0;
  border-radius: var(--app-radius-sm);

  .segmented-tabs__item {
    padding: 0 11px;
    border-radius: 0;
    font-size: 12px;

    &:first-child {
      border-start-start-radius: calc(var(--app-radius-sm) - 1px);
      border-end-start-radius: calc(var(--app-radius-sm) - 1px);
    }

    &:last-child {
      border-start-end-radius: calc(var(--app-radius-sm) - 1px);
      border-end-end-radius: calc(var(--app-radius-sm) - 1px);
    }
  }
}
</style>
