import * as React from 'react'

import type {
  ToastActionElement,
  ToastProps,
} from '../components/ui/toast'

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType['ADD_TOAST']
      toast: ToasterToast
    }
  | {
      type: ActionType['UPDATE_TOAST']
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType['DISMISS_TOAST']
      toastId?: ToasterToast['id']
    }
  | {
      type: ActionType['REMOVE_TOAST']
      toastId?: ToasterToast['id']
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case 'UPDATE_TOAST':
      if (!action.toast.id) return state
      {
        let didChange = false
        const nextToasts = state.toasts.map((t) => {
          if (t.id !== action.toast.id) return t
          const next = { ...t, ...action.toast }
          // If nothing actually changed, keep reference to avoid re-render loops
          const same =
            next.open === t.open &&
            next.title === t.title &&
            next.description === t.description &&
            next.variant === t.variant &&
            next.onOpenChange === t.onOpenChange &&
            next.action === t.action
          if (same) return t
          didChange = true
          return next
        })

        return didChange ? { ...state, toasts: nextToasts } : state
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      let didChange = false

      const nextToasts = state.toasts.map((t) => {
        const shouldDismiss = t.id === toastId || toastId === undefined
        if (!shouldDismiss) return t

        // Already dismissed -> keep reference (prevents nested update loops)
        if (t.open === false) return t

        didChange = true
        return { ...t, open: false }
      })

      if (!didChange) {
        return state
      }

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        nextToasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return { ...state, toasts: nextToasts }
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return state.toasts.length ? { ...state, toasts: [] } : state
      }
      {
        const nextToasts = state.toasts.filter((t) => t.id !== action.toastId)
        return nextToasts.length === state.toasts.length
          ? state
          : { ...state, toasts: nextToasts }
      }
    default:
      return state
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  const nextState = reducer(memoryState, action)
  if (nextState === memoryState) return
  memoryState = nextState
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Omit<ToasterToast, 'id'>

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
