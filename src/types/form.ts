export type FormValidateTrigger = 'blur' | 'change'

export interface FormRule {
  required?: boolean
  message?: string
  trigger?: FormValidateTrigger | FormValidateTrigger[]
  min?: number
  max?: number
  type?: 'string' | 'number' | 'email' | 'url' | 'array'
  pattern?: RegExp
  validator?: (
    rule: FormRule,
    value: unknown,
    callback: (error?: Error | string) => void
  ) => unknown
}

export type FormRules = Record<string, FormRule | FormRule[] | undefined>

export type FormValidateCallback = (isValid: boolean, invalidFields?: Record<string, string[]>) => void

export interface FormInstance {
  validate: (callback?: FormValidateCallback) => Promise<boolean>
  validateField: (props?: string | string[], callback?: FormValidateCallback) => Promise<boolean>
  clearValidate: (props?: string | string[]) => void
  resetFields: (props?: string | string[]) => void
}
