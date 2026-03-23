import type { App } from 'vue'
import { setupDirectives as setupPermissionDirectives } from './permission'

export function setupDirectives(app: App) {
  setupPermissionDirectives(app)
}
