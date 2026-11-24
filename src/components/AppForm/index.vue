<script setup lang="ts">
import { computed, provide, reactive } from 'vue'
import {
  FORM_CONTEXT_KEY,
  type AppFormItemField,
  type FormLabelPosition
} from '@/components/types'
import type { FormInstance, FormRules, FormValidateCallback } from '@/types/form'

const props = withDefaults(
  defineProps<{
    model?: Record<string, any>
    rules?: FormRules
    labelPosition?: FormLabelPosition
    labelWidth?: string | number
  }>(),
  {
    model: undefined,
    rules: undefined,
    labelPosition: undefined,
    labelWidth: undefined
  }
)

const emit = defineEmits<{
  submit: [event: SubmitEvent]
}>()

const fields = new Set<AppFormItemField>()

const resolvedLabelPosition = computed<FormLabelPosition>(() => {
  if (props.labelPosition) return props.labelPosition
  return props.labelWidth !== undefined ? 'right' : 'top'
})

function registerField(field: AppFormItemField): () => void {
  fields.add(field)
  return () => {
    fields.delete(field)
  }
}

function normalizePropFilter(targetProps?: string | string[]): Set<string> | null {
  if (!targetProps) return null
  const list = Array.isArray(targetProps) ? targetProps : [targetProps]
  return list.length > 0 ? new Set(list) : null
}

function getMatchingFields(targetProps?: string | string[]): AppFormItemField[] {
  const filter = normalizePropFilter(targetProps)
  const result: AppFormItemField[] = []
  for (const field of fields) {
    if (!field.prop) continue
    if (!filter || filter.has(field.prop)) {
      result.push(field)
    }
  }
  return result
}

async function runValidation(
  targetProps?: string | string[],
  callback?: FormValidateCallback
): Promise<boolean> {
  const targetFields = getMatchingFields(targetProps)
  if (targetFields.length === 0) {
    callback?.(true)
    return true
  }

  const invalidFields: Record<string, string[]> = {}
  const results = await Promise.all(
    targetFields.map(async (field) => {
      const error = await field.validate()
      return { prop: field.prop, error }
    })
  )

  for (const item of results) {
    if (item.error) {
      if (!invalidFields[item.prop]) {
        invalidFields[item.prop] = []
      }
      invalidFields[item.prop].push(item.error)
    }
  }

  const isValid = Object.keys(invalidFields).length === 0
  callback?.(isValid, isValid ? undefined : invalidFields)
  return isValid
}

const validate: FormInstance['validate'] = (callback) => runValidation(undefined, callback)

const validateField: FormInstance['validateField'] = (targetProps, callback) =>
  runValidation(targetProps, callback)

const clearValidate: FormInstance['clearValidate'] = (targetProps) => {
  const filter = normalizePropFilter(targetProps)
  for (const field of fields) {
    if (!filter || (field.prop && filter.has(field.prop))) {
      field.clearValidate()
    }
  }
}

const resetFields: FormInstance['resetFields'] = (targetProps) => {
  const filter = normalizePropFilter(targetProps)
  for (const field of fields) {
    if (!filter || (field.prop && filter.has(field.prop))) {
      field.resetField()
    }
  }
}

provide(
  FORM_CONTEXT_KEY,
  reactive({
    model: computed(() => props.model),
    rules: computed(() => props.rules),
    labelPosition: resolvedLabelPosition,
    labelWidth: computed(() => props.labelWidth),
    registerField
  })
)

function handleSubmit(event: SubmitEvent) {
  event.preventDefault()
  emit('submit', event)
}

defineExpose<FormInstance>({
  validate,
  validateField,
  clearValidate,
  resetFields
})
</script>

<template>
  <form
    class="app-form"
    :class="`is-label-${resolvedLabelPosition}`"
    novalidate
    @submit="handleSubmit"
  >
    <slot />
  </form>
</template>

<style lang="scss" scoped>
.app-form {
  width: 100%;
  min-width: 0;
}
</style>
