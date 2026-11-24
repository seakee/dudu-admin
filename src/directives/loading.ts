import type { Directive, DirectiveBinding } from 'vue'

interface LoadingHostElement extends HTMLElement {
  __cpampLoadingMask?: HTMLDivElement
  __cpampLoadingPositionOverridden?: boolean
}

function createLoadingMask(): HTMLDivElement {
  const mask = document.createElement('div')
  mask.className = 'cpamp-loading-mask'
  mask.setAttribute('role', 'status')
  mask.setAttribute('aria-live', 'polite')

  const spinner = document.createElement('span')
  spinner.className = 'loading-spinner cpamp-loading-spinner'
  spinner.setAttribute('aria-hidden', 'true')
  mask.appendChild(spinner)

  return mask
}

function syncLoadingState(el: LoadingHostElement, isLoading: boolean) {
  if (isLoading) {
    if (!el.__cpampLoadingMask) {
      const computed = window.getComputedStyle(el)
      if (computed.position === 'static') {
        el.classList.add('cpamp-loading-parent--relative')
        el.__cpampLoadingPositionOverridden = true
      }
      const mask = createLoadingMask()
      el.__cpampLoadingMask = mask
      el.appendChild(mask)
    }
    el.setAttribute('aria-busy', 'true')
    el.__cpampLoadingMask.classList.add('is-visible')
    return
  }

  el.removeAttribute('aria-busy')
  if (el.__cpampLoadingMask) {
    el.__cpampLoadingMask.remove()
    el.__cpampLoadingMask = undefined
  }
  if (el.__cpampLoadingPositionOverridden) {
    el.classList.remove('cpamp-loading-parent--relative')
    el.__cpampLoadingPositionOverridden = false
  }
}

export const vLoading: Directive<LoadingHostElement, boolean> = {
  mounted(el: LoadingHostElement, binding: DirectiveBinding<boolean>) {
    syncLoadingState(el, Boolean(binding.value))
  },
  updated(el: LoadingHostElement, binding: DirectiveBinding<boolean>) {
    if (Boolean(binding.value) !== Boolean(binding.oldValue)) {
      syncLoadingState(el, Boolean(binding.value))
    }
  },
  unmounted(el: LoadingHostElement) {
    syncLoadingState(el, false)
  }
}
