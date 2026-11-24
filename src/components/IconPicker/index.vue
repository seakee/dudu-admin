<script lang="ts">
import { shallowRef } from 'vue'

const loadedLucideIconNames = shallowRef<string[] | null>(null)
const loadedLucideIconSet = shallowRef<Set<string> | null>(null)
let lucideCatalogPromise: Promise<string[]> | null = null

function loadLucideCatalogNames(): Promise<string[]> {
  if (loadedLucideIconNames.value) {
    return Promise.resolve(loadedLucideIconNames.value)
  }
  if (!lucideCatalogPromise) {
    lucideCatalogPromise = import('@lucide/vue')
      .then((mod) => {
        const names = Object.keys(mod.icons).sort((a, b) => a.localeCompare(b))
        loadedLucideIconSet.value = new Set(names)
        loadedLucideIconNames.value = names
        return names
      })
      .catch((error) => {
        lucideCatalogPromise = null
        throw error
      })
  }
  return lucideCatalogPromise
}
</script>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FORM_ITEM_CONTEXT_KEY } from '@/components/types'

const DEFAULT_PREFERRED_ICONS = [
  'Gauge',
  'Settings',
  'Users',
  'User',
  'Shield',
  'KeyRound',
  'Lock',
  'LayoutGrid',
  'FileText',
  'Folder',
  'Bell',
  'ChartColumn',
  'ChartPie',
  'Monitor',
  'Link2',
  'Globe',
  'Calendar',
  'Timer',
  'Search'
]

const FONT_AWESOME_ICONS = [
  'house',
  'house-user',
  'building',
  'city',
  'shop',
  'warehouse',
  'gauge-high',
  'chart-column',
  'chart-line',
  'chart-pie',
  'chart-area',
  'signal',
  'gear',
  'sliders',
  'screwdriver-wrench',
  'wrench',
  'toolbox',
  'users',
  'user',
  'user-gear',
  'user-shield',
  'user-tie',
  'user-group',
  'cloud',
  'cloud-arrow-up',
  'cloud-arrow-down',
  'server',
  'database',
  'map',
  'map-location-dot',
  'location-dot',
  'compass',
  'route',
  'globe',
  'folder',
  'folder-open',
  'file',
  'file-lines',
  'book',
  'book-open',
  'newspaper',
  'clipboard',
  'bell',
  'envelope',
  'message',
  'comments',
  'paper-plane',
  'calendar',
  'clock',
  'hourglass-half',
  'stopwatch',
  'lock',
  'key',
  'shield-halved',
  'fingerprint',
  'magnifying-glass',
  'filter',
  'bars',
  'list',
  'table-cells-large',
  'sitemap',
  'link',
  'flag',
  'trophy',
  'star',
  'heart',
  'thumbs-up',
  'cart-shopping',
  'credit-card',
  'wallet',
  'coins',
  'receipt',
  'microchip',
  'robot',
  'code',
  'terminal',
  'bug'
]

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    clearable?: boolean
    disabled?: boolean
    popoverWidth?: number
    maxVisibleIcons?: number
    preferredIcons?: string[]
  }>(),
  {
    modelValue: '',
    placeholder: undefined,
    clearable: true,
    disabled: false,
    popoverWidth: 420,
    maxVisibleIcons: 240,
    preferredIcons: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  clear: []
}>()

const { t } = useI18n()
const formItem = inject(FORM_ITEM_CONTEXT_KEY, null)

const open = ref(false)
const searchKeyword = ref('')
const draftIcon = ref('')
const catalogLoading = ref(false)

const orderedIconNames = computed(() => {
  const preferred = props.preferredIcons ?? DEFAULT_PREFERRED_ICONS
  const preferredSet = new Set(preferred)
  const catalogSet = loadedLucideIconSet.value
  const validPreferred = catalogSet
    ? preferred.filter((name) => catalogSet.has(name) || name.startsWith('fa-'))
    : preferred
  const remainingLucide = loadedLucideIconNames.value
    ? loadedLucideIconNames.value.filter((name) => !preferredSet.has(name))
    : []

  return [
    ...validPreferred,
    ...remainingLucide,
    ...FONT_AWESOME_ICONS.map((name) => `fa-solid fa-${name}`)
  ]
})

const filteredIconNames = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const matched = keyword
    ? orderedIconNames.value.filter((name) => name.toLowerCase().includes(keyword))
    : orderedIconNames.value
  return matched.slice(0, props.maxVisibleIcons)
})

watch(open, (visible) => {
  if (visible) {
    draftIcon.value = props.modelValue || ''
    searchKeyword.value = ''
    if (!loadedLucideIconNames.value) {
      catalogLoading.value = true
      void loadLucideCatalogNames()
        .catch(() => {
          // Keep preferred and FontAwesome icons usable if dynamic catalog load fails
        })
        .finally(() => {
          catalogLoading.value = false
        })
    }
  }
})

function handleConfirm() {
  emit('update:modelValue', draftIcon.value)
  emit('change', draftIcon.value)
  formItem?.onChange()
  open.value = false
}

function handleClear() {
  emit('update:modelValue', '')
  emit('change', '')
  emit('clear')
  formItem?.onChange()
}
</script>

<template>
  <div class="icon-picker">
    <AppPopover
      v-model:open="open"
      trigger="click"
      placement="bottom-start"
      :width="props.popoverWidth"
      :disabled="props.disabled"
    >
      <template #reference>
        <AppButton
          variant="secondary"
          :disabled="props.disabled"
          :icon="props.modelValue || undefined"
          :aria-label="props.placeholder || t('common.selectPlaceholder')"
          :aria-expanded="open"
          class="icon-picker__trigger"
        >
          <span>{{ props.modelValue || props.placeholder || t('common.selectPlaceholder') }}</span>
        </AppButton>
      </template>

      <template #default>
        <div
          v-if="open"
          class="icon-picker__panel"
        >
          <AppInput
            v-model="searchKeyword"
            size="sm"
            clearable
            prefix-icon="Search"
            :aria-label="t('common.search')"
            :placeholder="t('common.search')"
            class="icon-picker__search"
          />
          <div class="icon-picker__grid">
            <button
              v-for="iconName in filteredIconNames"
              :key="iconName"
              type="button"
              class="icon-picker__item"
              :class="{ 'is-active': draftIcon === iconName }"
              :title="iconName"
              :aria-label="iconName"
              :aria-pressed="draftIcon === iconName"
              @click="draftIcon = iconName"
            >
              <AppIcon
                :name="iconName"
                :size="18"
              />
            </button>
          </div>
          <div class="icon-picker__actions">
            <span
              v-if="catalogLoading"
              class="icon-picker__status"
            >
              <AppIcon
                name="LoaderCircle"
                :size="14"
                spin
              />
              <span>{{ t('common.loading') }}</span>
            </span>
            <AppButton
              variant="link"
              size="sm"
              @click="open = false"
            >
              {{ t('common.cancel') }}
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              @click="handleConfirm"
            >
              {{ t('common.confirm') }}
            </AppButton>
          </div>
        </div>
      </template>
    </AppPopover>

    <AppButton
      v-if="props.clearable && props.modelValue && !props.disabled"
      variant="ghost"
      icon="X"
      icon-only
      :aria-label="t('common.clearSelection')"
      @click="handleClear"
    />
  </div>
</template>

<style lang="scss" scoped>
.icon-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.icon-picker__trigger {
  min-width: 0;
  max-width: 100%;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.icon-picker__search {
  margin-bottom: 12px;
}

.icon-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 2px 4px 6px 2px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--border-primary) transparent;
}

.icon-picker__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: var(--control-height-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--app-radius-xs);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;

  &:hover {
    border-color: var(--border-hover);
    background: var(--surface-subtle-hover);
  }

  &.is-active {
    border-color: var(--primary-color);
    background: var(--primary-subtle);
    color: var(--primary-text);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-border);
    outline-offset: 1px;
  }
}

.icon-picker__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  margin-top: 8px;
  border-top: 1px solid var(--border-subtle);

  .btn {
    min-width: 68px;
  }
}

.icon-picker__status {
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>
