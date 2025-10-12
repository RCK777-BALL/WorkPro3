/*
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react'

type AnyProps = Record<string, unknown>

type SlotProps = {
  children?: React.ReactNode
  asChild?: boolean
} & AnyProps

type SlottableProps = {
  children?: React.ReactNode
}

function isEventHandlerKey(key: string) {
  return key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref != null) {
    ;(ref as React.MutableRefObject<T | null>).current = value
  }
}

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => setRef(ref, node))
  }
}

function mergeProps(childProps: AnyProps, slotProps: AnyProps) {
  const result: AnyProps = { ...childProps }

  const childClassName = childProps.className as string | undefined
  const slotClassName = slotProps.className as string | undefined
  if (childClassName || slotClassName) {
    result.className = [childClassName, slotClassName].filter(Boolean).join(' ')
  }

  const childStyle = childProps.style as React.CSSProperties | undefined
  const slotStyle = slotProps.style as React.CSSProperties | undefined
  if (childStyle && slotStyle) {
    result.style = { ...childStyle, ...slotStyle }
  } else if (slotStyle) {
    result.style = slotStyle
  } else if (childStyle) {
    result.style = childStyle
  }

  const keys = new Set([...Object.keys(childProps), ...Object.keys(slotProps)])
  keys.forEach((key) => {
    if (!isEventHandlerKey(key)) {
      return
    }
    const childHandler = childProps[key]
    const slotHandler = slotProps[key]

    if (typeof childHandler === 'function' && typeof slotHandler === 'function') {
      result[key] = (...args: unknown[]) => {
        ;(slotHandler as (...args: unknown[]) => void)(...args)
        ;(childHandler as (...args: unknown[]) => void)(...args)
      }
    } else if (typeof slotHandler === 'function') {
      result[key] = slotHandler
    } else if (typeof childHandler === 'function') {
      result[key] = childHandler
    }
  })

  Object.keys(slotProps).forEach((key) => {
    if (key === 'children' || key === 'className' || key === 'style' || key === 'asChild' || isEventHandlerKey(key)) {
      return
    }
    result[key] = slotProps[key]
  })

  return result
}

const Slot = React.forwardRef<unknown, SlotProps>((props, forwardedRef) => {
  const { children, ...slotProps } = props

  if (!React.isValidElement(children)) {
    return <>{children}</>
  }

  const mergedProps = mergeProps(children.props as AnyProps, slotProps)
  const ref = composeRefs((children as unknown as { ref?: React.Ref<unknown> }).ref, forwardedRef)

  return React.cloneElement(children, { ...mergedProps, ref })
})
Slot.displayName = 'Slot'

const Slottable: React.FC<SlottableProps> = ({ children }) => <>{children}</>
Slottable.displayName = 'Slottable'

const SlotClone: typeof Slot = Slot
const Root: typeof Slot = Slot

function createSlot(): typeof Slot {
  return Slot
}

export { Slot, SlotClone, Slottable, Root, createSlot }
export type { SlotProps, SlottableProps }
