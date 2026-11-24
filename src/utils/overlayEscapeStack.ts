const openModalStack: symbol[] = []

export function registerOpenModal(): (() => void) & { token: symbol } {
  const token = Symbol('cpamp-modal')
  openModalStack.push(token)

  const unregister = () => {
    const index = openModalStack.lastIndexOf(token)
    if (index >= 0) {
      openModalStack.splice(index, 1)
    }
  }

  unregister.token = token
  return unregister
}

export function isTopmostModal(token: symbol): boolean {
  return openModalStack.length > 0 && openModalStack[openModalStack.length - 1] === token
}
