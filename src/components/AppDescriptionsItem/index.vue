<script setup lang="ts">
import {
  inject,
  onBeforeUnmount,
  onMounted,
  reactive,
  useId,
  useSlots,
  watch,
  type VNodeChild
} from 'vue'

interface RegisteredDescriptionItem {
  id: string
  label?: string
  span: number
  className?: string
  labelClassName?: string
  hasDefaultSlot: () => boolean
  renderDefault: () => VNodeChild
  hasLabelSlot: () => boolean
  renderLabel: () => VNodeChild
}

interface DescriptionsContext {
  registerItem: (item: RegisteredDescriptionItem) => void
  unregisterItem: (id: string) => void
  requestOrderSync: () => void
}

const APP_DESCRIPTIONS_CONTEXT_KEY = Symbol.for('cpamp-app-descriptions-context')

const props = withDefaults(
  defineProps<{
    label?: string
    span?: number
    className?: string
    labelClassName?: string
  }>(),
  {
    label: '',
    span: 1,
    className: undefined,
    labelClassName: undefined
  }
)

const slots = useSlots()
const itemId = useId()
const descContext = inject<DescriptionsContext | null>(APP_DESCRIPTIONS_CONTEXT_KEY, null)

const itemDescriptor = reactive<RegisteredDescriptionItem>({
  id: itemId,
  label: props.label,
  span: props.span,
  className: props.className,
  labelClassName: props.labelClassName,
  hasDefaultSlot: () => Boolean(slots.default),
  renderDefault: () => (slots.default ? slots.default() : null),
  hasLabelSlot: () => Boolean(slots.label),
  renderLabel: () => (slots.label ? slots.label() : null)
})

watch(
  () => [props.label, props.span, props.className, props.labelClassName],
  () => {
    itemDescriptor.label = props.label
    itemDescriptor.span = props.span
    itemDescriptor.className = props.className
    itemDescriptor.labelClassName = props.labelClassName
    descContext?.requestOrderSync()
  }
)

onMounted(() => {
  descContext?.registerItem(itemDescriptor)
})

onBeforeUnmount(() => {
  descContext?.unregisterItem(itemId)
})
</script>

<template>
  <span :data-app-desc-id="itemId" />
</template>
