import type { InjectionKey } from 'vue'
import type { FormRules, FormValidateTrigger } from '@/types/form'

export type MetricSummaryAccent =
  | 'blue'
  | 'green'
  | 'red'
  | 'amber'
  | 'indigo'
  | 'cyan'
  | 'violet'
  | 'teal'
  | 'neutral'

export type MetricSummaryDensity = 'default' | 'compact'

export interface MetricSummaryCardItem {
  id: string
  label: string
  fullLabel?: string
  value: string | number
  valueTitle?: string
  meta?: string
  accent?: MetricSummaryAccent
  icon?: string
  points?: number[]
}

export interface SegmentedTabItem<T extends string = string> {
  id: T
  label: string
  count?: number | string
  disabled?: boolean
  title?: string
  ariaLabel?: string
  ariaControls?: string
  to?: string
}

export type StatusPillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export type SortDirection = 'asc' | 'desc'

export interface SortControlOption<K extends string = string> {
  value: K
  label: string
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'link'

export type ButtonSize = 'lg' | 'md' | 'sm' | 'xs'

export type ButtonTone = 'primary' | 'danger' | 'warning' | 'success' | 'neutral'
export type ControlSize = 'lg' | 'md' | 'sm'

export interface SelectOption<V extends string | number | boolean = string | number | boolean> {
  value: V
  label: string
  disabled?: boolean
}

export interface DropdownItem {
  key: string
  label?: string
  icon?: string
  disabled?: boolean
  tone?: 'default' | 'danger'
  divided?: boolean
  active?: boolean
  type?: 'item' | 'divider'
}

export type TableColumnAlign = 'left' | 'center' | 'right'

export type TableColumnFixed = 'left' | 'right' | boolean
export type TableActionVariant = 'link' | 'soft' | 'secondary' | 'ghost'
export type TableActionIconMode = 'none' | 'auto' | 'only'

export interface TableActionItem {
  key: string
  label: string
  icon?: string
  tone?: ButtonTone
  variant?: ButtonVariant
  showIcon?: boolean
  disabled?: boolean
  loading?: boolean
  hidden?: boolean
  divided?: boolean
  onClick?: () => void
}


export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface StepItem {
  title: string
  description?: string
}

export type FormLabelPosition = 'top' | 'left' | 'right'

export interface AppFormItemField {
  prop: string
  validate: (trigger?: FormValidateTrigger) => Promise<string>
  clearValidate: () => void
  resetField: () => void
}

export interface AppFormContext {
  readonly model: Record<string, unknown> | undefined
  readonly rules: FormRules | undefined
  readonly labelPosition: FormLabelPosition
  readonly labelWidth: string | number | undefined
  registerField: (field: AppFormItemField) => () => void
}

export interface AppFormItemContext {
  readonly prop: string | undefined
  readonly inputId: string
  readonly hasError: boolean
  onBlur: () => void
  onChange: () => void
}

export const FORM_CONTEXT_KEY: InjectionKey<AppFormContext> = Symbol('AppFormContext')

export const FORM_ITEM_CONTEXT_KEY: InjectionKey<AppFormItemContext> = Symbol('AppFormItemContext')
