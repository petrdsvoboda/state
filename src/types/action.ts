import { AnyEventObject, AutoEvent, EventObject } from './event'
import { Schema, StateName } from './state'
import { Context } from './context'

export type Action = string | number
export type ActionTuple = [Action, StateName<any>]

export type ActionFn<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TContext extends Context | undefined
> = (options: {
	currentState: StateName<TSchema>
	event: TEventObject
	context: TContext
}) => Promise<Partial<TContext>>

export type ActionMap<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TAction extends Action,
	TContext extends Context | undefined = undefined
> = Record<
	TAction,
	ActionFn<TSchema, TEventObject | EventObject<AutoEvent>, TContext>
>

export type AnyActionMap = ActionMap<any, any, any, any>
