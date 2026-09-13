let counter = 0

/** Short id for ephemeral elements (toasts, new rows). */
export const newId = (): string => {
  counter += 1
  return `id-${Date.now().toString(36)}-${counter}`
}
