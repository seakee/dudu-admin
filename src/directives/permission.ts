import type { App, Directive } from 'vue'

// 权限指令
const permissionDirective: Directive = {}

// 角色指令
const roleDirective: Directive = {}

export function setupDirectives(app: App) {
  app.directive('permission', permissionDirective)
  app.directive('role', roleDirective)
}
