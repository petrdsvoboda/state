import { HistoryState, Schema, StateNodeName } from './state'
import { Action } from './action'
import { Guard } from './guard'
import { AutoEvent } from './event'

type Target<T extends Schema> = StateNodeName<T> | HistoryState

export type BaseTransitionConfig<
	TName extends Target<any>,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> = { target: TName } & ([TAction] extends [NonNullable<infer A>]
	? { actions?: A | Array<A> }
	: unknown) &
	([TGuard] extends [NonNullable<infer G>]
		? { cond?: G | Array<G> }
		: unknown)

export type SimpleTransitionConfig<
	TSchema extends Schema,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> = BaseTransitionConfig<StateNodeName<TSchema>, TAction, TGuard>

export type HistoryTransitionConfig<
	TSchema extends Schema,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> = BaseTransitionConfig<HistoryState, TAction, TGuard> & {
	ignore?: StateNodeName<TSchema> | StateNodeName<TSchema>[]
}

export type TransitionConfig<
	TSchema extends Schema,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> =
	| SimpleTransitionConfig<TSchema, TAction, TGuard>
	| HistoryTransitionConfig<TSchema, TAction, TGuard>

export type AnyBaseTransitionConfig = BaseTransitionConfig<any, any, any>
export type AnySimpleTransitionConfig = SimpleTransitionConfig<any, any, any>
export type AnyHistoryTransitionConfig = HistoryTransitionConfig<any, any, any>
export type AnyTransitionConfig = TransitionConfig<any, any, any>

export type Transition<
	TSchema extends Schema,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> =
	| StateNodeName<TSchema>
	| '$history'
	| TransitionConfig<TSchema, TAction, TGuard>
	| TransitionConfig<TSchema, TAction, TGuard>[]

export type AnyTransition = Transition<any, any, any>

export type TransitionMap<
	TSchema extends Schema,
	TEvent extends string,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> = Partial<Record<TEvent | AutoEvent, Transition<TSchema, TAction, TGuard>>>
