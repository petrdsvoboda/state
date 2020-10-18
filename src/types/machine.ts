import { Action } from './action'
import { AutoEvent } from './event'
import { Guard } from './guard'
import { Schema, StateNodeName } from './state'
import { TransitionMap } from './transition'

type StateType = 'default' | 'final'

export type LeafStateNode<
	TRootSchema extends Schema,
	TEvent extends string,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> = {
	on?: TransitionMap<TRootSchema, TEvent, TAction, TGuard>
	type?: StateType
} & (TAction extends NonNullable<infer A>
	? {
			entry?: Array<A>
			exit?: Array<A>
	  }
	: unknown)

export type StateNode<
	TRootSchema extends Schema,
	TSchema extends Schema,
	TEvent extends string,
	TAction extends Action | undefined,
	TGuard extends Guard | undefined
> = LeafStateNode<TRootSchema, TEvent, TAction, TGuard> & {
	initial: StateNodeName<TSchema>
	states: {
		[K in keyof TSchema]: TSchema[K] extends null
			? LeafStateNode<TRootSchema, TEvent, TAction, TGuard>
			: StateNode<
					TRootSchema,
					NonNullable<TSchema[K]>,
					TEvent,
					TAction,
					TGuard
			  >
	}
}

export type AnyStateNode =
	| StateNode<any, any, any, any, any>
	| LeafStateNode<any, any, any, any>

export type Machine<
	TStateSchema extends Schema,
	TEvent extends string,
	TAction extends Action | undefined = undefined,
	TGuard extends Guard | undefined = undefined
> = {
	id: string
} & StateNode<TStateSchema, TStateSchema, TEvent | AutoEvent, TAction, TGuard>

export type AnyMachine = Machine<any, any, any, any>
