import type { App } from 'vue'
import { setupDirectives as setupPermissionDirectives } from './permission'
import { vLoading } from './loading'

export function setupDirectives(app: App) {
  setupPermissionDirectives(app)
  app.directive('loading', vLoading)
}
