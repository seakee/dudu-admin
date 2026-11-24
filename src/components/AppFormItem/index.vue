<script lang="ts">
let nextFormItemUid = 0
</script>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  type CSSProperties
} from 'vue'
import {
  FORM_CONTEXT_KEY,
  FORM_ITEM_CONTEXT_KEY,
  type FormLabelPosition
} from '@/components/types'
import type { FormRule, FormValidateTrigger } from '@/types/form'

const props = withDefaults(
  defineProps<{
    label?: string
    prop?: string
    required?: boolean
    rules?: FormRule | FormRule[]
    labelWidth?: string | number
    error?: string
  }>(),
  {
    label: undefined,
    prop: undefined,
    required: undefined,
    rules: undefined,
    labelWidth: undefined,
    error: undefined
  }
)

const formContext = inject(FORM_CONTEXT_KEY, null)
const inputId = `cpamp-form-item-${++nextFormItemUid}`

const errorMessage = ref('')
let initialValueSnapshot: unknown = undefined
let isResetting = false
let unregisterField: (() => void) | null = null

const displayedError = computed(() => props.error ?? errorMessage.value)
const hasError = computed(() => Boolean(displayedError.value))

const labelPosition = computed<FormLabelPosition>(
  () => formContext?.labelPosition ?? 'top'
)

const resolvedLabelWidth = computed<string | undefined>(() => {
  const raw = props.labelWidth ?? formContext?.labelWidth
  if (raw === undefined || raw === '' || raw === 'auto') return undefined
  if (typeof raw === 'number') return `${raw}px`
  const trimmed = raw.trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed
})

const labelStyle = computed<CSSProperties | undefined>(() => {
  if (labelPosition.value === 'top' || !resolvedLabelWidth.value) return undefined
  return {
    width: resolvedLabelWidth.value,
    flex: `0 0 ${resolvedLabelWidth.value}`
  }
})

const normalizedRules = computed<FormRule[]>(() => {
  const collected: FormRule[] = []

  if (props.prop && formContext?.rules) {
    const fromForm = formContext.rules[props.prop]
    if (Array.isArray(fromForm)) {
      collected.push(...fromForm)
    } else if (fromForm) {
      collected.push(fromForm)
    }
  }

  if (Array.isArray(props.rules)) {
    collected.push(...props.rules)
  } else if (props.rules) {
    collected.push(props.rules)
  }

  if (props.required === true && !collected.some((rule) => rule.required)) {
    collected.unshift({ required: true })
  }

  return collected
})

const isRequired = computed(() => {
  if (props.required !== undefined) return props.required
  return normalizedRules.value.some((rule) => Boolean(rule.required))
})

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value]
  if (value && typeof value === 'object') return { ...(value as Record<string, unknown>) }
  return value
}

function getFieldValue(): unknown {
  if (!props.prop || !formContext?.model) return undefined
  const segments = props.prop.split('.')
  let current: unknown = formContext.model
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function setFieldValue(nextValue: unknown) {
  if (!props.prop || !formContext?.model) return
  const segments = props.prop.split('.')
  let current: Record<string, unknown> = formContext.model
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]
    const nested = current[key]
    if (!nested || typeof nested !== 'object') return
    current = nested as Record<string, unknown>
  }
  const lastKey = segments[segments.length - 1]
  if (lastKey) {
    current[lastKey] = cloneValue(nextValue)
  }
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function matchesTrigger(rule: FormRule, trigger?: FormValidateTrigger): boolean {
  if (!trigger || !rule.trigger) return true
  return Array.isArray(rule.trigger)
    ? rule.trigger.includes(trigger)
    : rule.trigger === trigger
}

async function runCustomValidator(rule: FormRule, value: unknown): Promise<string> {
  const validator = rule.validator
  if (!validator) return ''
  return new Promise<string>((resolve) => {
    let settled = false
    const finish = (err?: Error | string) => {
      if (settled) return
      settled = true
      if (!err) {
        resolve('')
        return
      }
      resolve(typeof err === 'string' ? err : err.message || rule.message || 'Invalid value')
    }

    try {
      const maybePromise = validator(rule, value, finish) as unknown
      const promiseCandidate = maybePromise as Promise<unknown> | null | undefined
      if (promiseCandidate && typeof promiseCandidate.then === 'function') {
        promiseCandidate.then(
          () => finish(),
          (reason: unknown) =>
            finish(
              reason instanceof Error
                ? reason
                : typeof reason === 'string'
                  ? reason
                  : rule.message || 'Invalid value'
            )
        )
      }
    } catch (err) {
      finish(err instanceof Error ? err : String(err))
    }
  })
}

async function evaluateSingleRule(rule: FormRule, value: unknown): Promise<string> {
  const defaultMsg = rule.message || 'Invalid value'
  const empty = isEmptyValue(value)

  if (rule.required && empty) {
    return rule.message || 'Required'
  }

  if (rule.validator) {
    return runCustomValidator(rule, value)
  }

  if (empty) {
    return ''
  }

  if (rule.type) {
    if (rule.type === 'email') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRe.test(String(value))) return defaultMsg
    } else if (rule.type === 'url') {
      try {
        const parsed = new URL(String(value))
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return defaultMsg
        }
      } catch {
        return defaultMsg
      }
    } else if (rule.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) return defaultMsg
    } else if (rule.type === 'array') {
      if (!Array.isArray(value)) return defaultMsg
    } else if (rule.type === 'string') {
      if (typeof value !== 'string') return defaultMsg
    }
  }

  if (rule.min !== undefined || rule.max !== undefined) {
    const size =
      typeof value === 'number' || rule.type === 'number'
        ? Number(value)
        : Array.isArray(value)
          ? value.length
          : String(value).length

    if (rule.min !== undefined && size < rule.min) return defaultMsg
    if (rule.max !== undefined && size > rule.max) return defaultMsg
  }

  if (rule.pattern) {
    const safeRegex = new RegExp(rule.pattern.source, rule.pattern.flags.replace('g', ''))
    if (!safeRegex.test(String(value))) return defaultMsg
  }

  return ''
}

async function validate(trigger?: FormValidateTrigger): Promise<string> {
  if (isResetting || !props.prop) return ''
  const rulesToRun = normalizedRules.value.filter((rule) => matchesTrigger(rule, trigger))
  if (rulesToRun.length === 0) {
    return trigger ? errorMessage.value : ''
  }

  const value = getFieldValue()
  for (const rule of rulesToRun) {
    const err = await evaluateSingleRule(rule, value)
    if (err) {
      errorMessage.value = err
      return err
    }
  }

  errorMessage.value = ''
  return ''
}

function clearValidate() {
  errorMessage.value = ''
}

function resetField() {
  isResetting = true
  setFieldValue(initialValueSnapshot)
  errorMessage.value = ''
  nextTick(() => {
    isResetting = false
  })
}

provide(
  FORM_ITEM_CONTEXT_KEY,
  reactive({
    prop: computed(() => props.prop),
    inputId,
    hasError,
    onBlur: () => {
      void validate('blur')
    },
    onChange: () => {
      void validate('change')
    }
  })
)

onMounted(() => {
  initialValueSnapshot = cloneValue(getFieldValue())
  if (props.prop && formContext) {
    unregisterField = formContext.registerField({
      prop: props.prop,
      validate,
      clearValidate,
      resetField
    })
  }
})

onBeforeUnmount(() => {
  unregisterField?.()
  unregisterField = null
})

defineExpose({
  validate,
  clearValidate,
  resetField
})
</script>

<template>
  <div
    class="app-form-item"
    :class="[
      `is-label-${labelPosition}`,
      {
        'is-required': isRequired,
        'is-error': hasError
      }
    ]"
  >
    <label
      v-if="props.label || $slots.label"
      :for="inputId"
      class="app-form-item__label"
      :style="labelStyle"
    >
      <span
        v-if="isRequired"
        class="app-form-item__asterisk"
        aria-hidden="true"
      >*</span>
      <slot name="label">
        {{ props.label }}
      </slot>
    </label>

    <div class="app-form-item__content">
      <slot />
      <div
        v-if="displayedError"
        class="app-form-item__error"
        role="alert"
      >
        {{ displayedError }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
  min-width: 0;

  &.is-label-left,
  &.is-label-right {
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
  }

  &.is-label-right .app-form-item__label {
    justify-content: flex-end;
    text-align: right;
  }

  &.is-label-left .app-form-item__label {
    justify-content: flex-start;
    text-align: left;
  }

  @include mobile {
    &.is-label-left,
    &.is-label-right {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;

      .app-form-item__label {
        width: auto;
        flex: 0 0 auto;
        justify-content: flex-start;
        text-align: left;
        min-height: 0;
        padding-top: 0;
      }
    }
  }
}

.app-form-item__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  user-select: none;
}

.app-form-item.is-label-left .app-form-item__label,
.app-form-item.is-label-right .app-form-item__label {
  min-height: var(--control-height-md);
  padding-top: 0;
  align-items: center;
}

.app-form-item__asterisk {
  color: var(--data-badge-danger-text);
  font-weight: 700;
  line-height: 1;
}

.app-form-item__content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-width: 0;
  min-height: var(--control-height-md);
  position: relative;
}

.app-form-item__error {
  margin-top: 4px;
  color: var(--data-badge-danger-text);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
}
</style>
