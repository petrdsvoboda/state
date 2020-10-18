import { AnyEventObject, AutoEvent, EventObject } from './event'
import { Schema, StateName } from './state'
import { Context } from './context'

export type Guard = string | number

export type GuardFn<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TContext extends Context | undefined
> = (options: {
	context: TContext
	currentState: StateName<TSchema>
	event: TEventObject
}) => Promise<boolean>

export type AnyGuardFn = GuardFn<any, any, any>

export type GuardMap<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TGuard extends Guard,
	TContext extends Context | undefined = undefined
> = Record<
	TGuard,
	GuardFn<TSchema, TEventObject | EventObject<AutoEvent>, TContext>
>

export type AnyGuardMap = GuardMap<any, any, any, any>
