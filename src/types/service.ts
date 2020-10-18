import { Context } from './context'
import { Schema, StateName } from './state'
import { Machine } from './machine'
import { Action, ActionMap } from './action'
import { Guard, GuardMap } from './guard'
import { AnyEventObject } from './event'

type ActionConfig<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TAction extends Action | undefined,
	TContext extends Context | undefined
> = TAction extends undefined
	? unknown
	: {
			actions: ActionMap<
				TSchema,
				TEventObject,
				NonNullable<TAction>,
				TContext
			>
	  }

type GuardConfig<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TGuard extends Guard | undefined,
	TContext extends Context | undefined
> = TGuard extends undefined
	? unknown
	: { guards: GuardMap<TSchema, TEventObject, NonNullable<TGuard>, TContext> }

export type ServiceConfig<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TAction extends Action | undefined = undefined,
	TGuard extends Guard | undefined = undefined,
	TContext extends Context | undefined = undefined
> = {
	machine: Machine<TSchema, TEventObject['type'], TAction, TGuard>
} & ActionConfig<TSchema, TEventObject, TAction, TContext> &
	GuardConfig<TSchema, TEventObject, TGuard, TContext>

export type ServiceData<
	TSchema extends Schema,
	TContext extends Context | undefined
> = {
	currentState: StateName<TSchema>
	history: StateName<TSchema>[]
} & (TContext extends undefined ? unknown : { context: TContext })

export type Service<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TAction extends Action | undefined = undefined,
	TGuard extends Guard | undefined = undefined,
	TContext extends Context | undefined = undefined
> = ServiceConfig<TSchema, TEventObject, TAction, TGuard, TContext> &
	ServiceData<TSchema, TContext>

export type AnyService = Service<any, any, any, any, any>
