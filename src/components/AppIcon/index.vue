<script lang="ts">
import { shallowRef } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  Bookmark,
  Building,
  Calendar,
  ChartBar,
  ChartColumn,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  CircleQuestionMark,
  CircleUserRound,
  CircleX,
  Cloud,
  CloudUpload,
  Copy,
  Ellipsis,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  Gauge,
  Globe,
  House,
  Image,
  Inbox,
  Info,
  Key,
  KeyRound,
  LayoutGrid,
  Link,
  Link2,
  LoaderCircle,
  Lock,
  LockOpen,
  LogOut,
  MapPin,
  Maximize2,
  MessageSquare,
  Minus,
  Monitor,
  Moon,
  Move,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SquarePen,
  StickyNote,
  Store,
  Sun,
  Tags,
  Ticket,
  Timer,
  Trash,
  TrendingUp,
  TriangleExclamationPoint,
  User,
  UserCheck,
  Users,
  Wrench,
  X,
  type LucideIcon
} from '@lucide/vue'

type LucideRegistry = Record<string, LucideIcon | undefined>

interface LoadedLucideCatalog {
  icons: LucideRegistry
  exports: Record<string, unknown>
}

const CORE_LUCIDE_ICONS: LucideRegistry = {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  Bookmark,
  Building,
  Calendar,
  ChartBar,
  ChartColumn,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  CircleQuestionMark,
  CircleUserRound,
  CircleX,
  Cloud,
  CloudUpload,
  Copy,
  Ellipsis,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  Gauge,
  Globe,
  House,
  Image,
  Inbox,
  Info,
  Key,
  KeyRound,
  LayoutGrid,
  Link,
  Link2,
  LoaderCircle,
  Lock,
  LockOpen,
  LogOut,
  MapPin,
  Maximize2,
  MessageSquare,
  Minus,
  Monitor,
  Moon,
  Move,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SquarePen,
  StickyNote,
  Store,
  Sun,
  Tags,
  Ticket,
  Timer,
  Trash,
  TrendingUp,
  TriangleExclamationPoint,
  User,
  UserCheck,
  Users,
  Wrench,
  X
}

const LEGACY_ICON_MAP: Record<string, string> = {
  RefreshRight: 'RotateCw',
  Refresh: 'RotateCw',
  RefreshLeft: 'RotateCcw',
  MoreFilled: 'Ellipsis',
  More: 'Ellipsis',
  MoreHorizontal: 'Ellipsis',
  Setting: 'Settings',
  Tools: 'Wrench',
  Operation: 'SlidersHorizontal',
  Odometer: 'Gauge',
  Document: 'FileText',
  CircleCheck: 'CircleCheck',
  CircleCheckFilled: 'CircleCheck',
  SuccessFilled: 'CircleCheck',
  CheckCircle2: 'CircleCheck',
  CircleClose: 'CircleX',
  CircleCloseFilled: 'CircleX',
  XCircle: 'CircleX',
  CloseBold: 'X',
  Close: 'X',
  Warning: 'TriangleExclamationPoint',
  WarningFilled: 'TriangleExclamationPoint',
  AlertTriangle: 'TriangleExclamationPoint',
  TriangleAlert: 'TriangleExclamationPoint',
  InfoFilled: 'Info',
  QuestionFilled: 'CircleQuestionMark',
  HelpCircle: 'CircleQuestionMark',
  CircleHelp: 'CircleQuestionMark',
  Picture: 'Image',
  PictureFilled: 'Image',
  Connection: 'Link2',
  TrendCharts: 'TrendingUp',
  DataAnalysis: 'ChartColumn',
  BarChart3: 'ChartColumn',
  Histogram: 'ChartBar',
  BarChart2: 'ChartBar',
  PieChart: 'ChartPie',
  Message: 'MessageSquare',
  ChatDotRound: 'MessageSquare',
  Iphone: 'Smartphone',
  Cellphone: 'Smartphone',
  ArrowDown: 'ChevronDown',
  CaretBottom: 'ChevronDown',
  ArrowUp: 'ChevronUp',
  CaretTop: 'ChevronUp',
  ArrowRight: 'ChevronRight',
  CaretRight: 'ChevronRight',
  ArrowLeft: 'ChevronLeft',
  CaretLeft: 'ChevronLeft',
  Back: 'ArrowLeft',
  Right: 'ArrowRight',
  Fold: 'PanelLeftClose',
  Expand: 'PanelLeftOpen',
  Delete: 'Trash',
  DeleteFilled: 'Trash',
  Trash2: 'Trash',
  Edit: 'Pencil',
  EditPen: 'SquarePen',
  View: 'Eye',
  Hide: 'EyeOff',
  CopyDocument: 'Copy',
  Menu: 'LayoutGrid',
  Monitor: 'Monitor',
  Moon: 'Moon',
  Sunny: 'Sun',
  Check: 'Check',
  HomeFilled: 'House',
  UserFilled: 'UserCheck',
  Avatar: 'CircleUserRound',
  FolderOpened: 'FolderOpen',
  Tickets: 'Ticket',
  Memo: 'StickyNote',
  Reading: 'BookOpen',
  CollectionTag: 'Bookmark',
  Notification: 'BellRing',
  Cloudy: 'Cloud',
  MapLocation: 'MapPin',
  Location: 'MapPin',
  LocationFilled: 'MapPin',
  Position: 'Navigation',
  Shop: 'Store',
  OfficeBuilding: 'Building',
  Building2: 'Building',
  Loading: 'LoaderCircle',
  Loader2: 'LoaderCircle',
  UploadFilled: 'CloudUpload',
  UploadCloud: 'CloudUpload',
  Rank: 'Move',
  FullScreen: 'Maximize2',
  SwitchButton: 'Power',
  Unlock: 'LockOpen'
}

const FA_STYLE_CLASSES = new Set([
  'fa-solid',
  'fa-regular',
  'fa-brands',
  'fa-light',
  'fa-thin',
  'fa-duotone',
  'fas',
  'far',
  'fab'
])

const NON_ICON_EXPORTS = new Set([
  'default',
  'icons',
  'Icon',
  'createLucideIcon',
  'setLucideProps',
  'useLucideProps',
  'LUCIDE_CONTEXT'
])

const dynamicLucideCatalog = shallowRef<LoadedLucideCatalog | null>(null)
let dynamicLucidePromise: Promise<LoadedLucideCatalog> | null = null

function loadDynamicLucideIcons(): Promise<LoadedLucideCatalog> {
  if (dynamicLucideCatalog.value) {
    return Promise.resolve(dynamicLucideCatalog.value)
  }
  if (!dynamicLucidePromise) {
    dynamicLucidePromise = import('@lucide/vue')
      .then((mod) => {
        const catalog: LoadedLucideCatalog = {
          icons: mod.icons as unknown as LucideRegistry,
          exports: mod as unknown as Record<string, unknown>
        }
        dynamicLucideCatalog.value = catalog
        return catalog
      })
      .catch((error) => {
        dynamicLucidePromise = null
        throw error
      })
  }
  return dynamicLucidePromise
}

function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function getOwnIcon(registry: LucideRegistry, key: string): LucideIcon | null {
  if (!Object.prototype.hasOwnProperty.call(registry, key)) {
    return null
  }
  return registry[key] ?? null
}

function getDynamicExportIcon(catalog: LoadedLucideCatalog, key: string): LucideIcon | null {
  const fromIcons = getOwnIcon(catalog.icons, key)
  if (fromIcons) return fromIcons

  if (NON_ICON_EXPORTS.has(key) || !Object.prototype.hasOwnProperty.call(catalog.exports, key)) {
    return null
  }
  const candidate = catalog.exports[key]
  return typeof candidate === 'function' ? (candidate as LucideIcon) : null
}

function resolveStaticLucideIcon(raw: string): LucideIcon | null {
  const mapped = LEGACY_ICON_MAP[raw] ?? raw
  const direct = getOwnIcon(CORE_LUCIDE_ICONS, mapped)
  if (direct) return direct

  const pascal = toPascalCase(mapped)
  const remapped = LEGACY_ICON_MAP[pascal] ?? pascal
  return getOwnIcon(CORE_LUCIDE_ICONS, remapped)
}

function resolveDynamicLucideIcon(raw: string, catalog: LoadedLucideCatalog | null): LucideIcon | null {
  if (!catalog) return null
  const mapped = LEGACY_ICON_MAP[raw] ?? raw
  const direct = getDynamicExportIcon(catalog, mapped)
  if (direct) return direct

  const pascal = toPascalCase(mapped)
  const remapped = LEGACY_ICON_MAP[pascal] ?? pascal
  return getDynamicExportIcon(catalog, remapped)
}
</script>

<script setup lang="ts">
import { computed, useAttrs, watch, type CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    name?: string
    size?: number | string
    spin?: boolean
  }>(),
  {
    name: '',
    size: undefined,
    spin: false
  }
)

const attrs = useAttrs()

const normalizedName = computed(() =>
  typeof props.name === 'string' ? props.name.trim() : ''
)

const fontAwesomeClasses = computed<string[]>(() => {
  const raw = normalizedName.value
  if (!raw) return []

  const tokens = raw.split(/\s+/).filter(Boolean)
  const isFa = tokens.some(
    (token) => token.startsWith('fa-') || FA_STYLE_CLASSES.has(token)
  )
  if (!isFa) return []

  const hasStyle = tokens.some((token) => FA_STYLE_CLASSES.has(token))
  if (!hasStyle) {
    tokens.unshift('fa-solid')
  }
  return Array.from(new Set(tokens))
})

const syncLucideComponent = computed<LucideIcon | null>(() => {
  const raw = normalizedName.value
  if (!raw || fontAwesomeClasses.value.length > 0) {
    return null
  }
  return resolveStaticLucideIcon(raw)
})

watch(
  [normalizedName, fontAwesomeClasses, syncLucideComponent],
  ([raw, faClasses, syncIcon]) => {
    if (!raw || faClasses.length > 0 || syncIcon || dynamicLucideCatalog.value) {
      return
    }
    void loadDynamicLucideIcons().catch(() => {
      // Ignore transient dynamic icon catalog load failures
    })
  },
  { immediate: true }
)

const lucideComponent = computed<LucideIcon | null>(() => {
  const raw = normalizedName.value
  if (!raw || fontAwesomeClasses.value.length > 0) {
    return null
  }
  return syncLucideComponent.value ?? resolveDynamicLucideIcon(raw, dynamicLucideCatalog.value)
})

const resolvedCssSize = computed<string | undefined>(() => {
  if (props.size === undefined || props.size === '') return undefined
  if (typeof props.size === 'number') return `${props.size}px`
  const trimmed = props.size.trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed
})

const resolvedLucideSize = computed<number | string>(() => {
  if (props.size === undefined || props.size === '') return '1em'
  if (typeof props.size === 'number') return props.size
  const trimmed = props.size.trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : trimmed
})

const wrapperStyle = computed<CSSProperties | undefined>(() => {
  const size = resolvedCssSize.value
  if (!size) return undefined
  return {
    width: size,
    height: size,
    fontSize: size
  }
})

const hasAriaLabel = computed(() => Boolean(attrs['aria-label']))
</script>

<template>
  <span
    v-if="lucideComponent || fontAwesomeClasses.length > 0"
    v-bind="$attrs"
    class="app-icon"
    :class="{ 'is-spin': props.spin }"
    :style="wrapperStyle"
    :aria-hidden="hasAriaLabel ? undefined : 'true'"
  >
    <component
      :is="lucideComponent"
      v-if="lucideComponent"
      :size="resolvedLucideSize"
      aria-hidden="true"
      focusable="false"
    />
    <i
      v-else
      :class="fontAwesomeClasses"
      aria-hidden="true"
    />
  </span>
</template>

<style lang="scss" scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  color: inherit;

  :deep(svg) {
    display: block;
    flex-shrink: 0;
  }

  i {
    line-height: 1;
    font-size: inherit;
  }

  &.is-spin {
    animation: cpamp-spin 0.9s linear infinite;
  }
}
</style>
