export type Context = Record<string, unknown>

export type EventObject<TType> = {
	type: TType
}
export type EventObjectWithPayload<TType, TPayload> = EventObject<TType> & {
	payload: TPayload
}
export type AnyEventObject =
	| EventObject<string>
	| EventObjectWithPayload<string, any>
export type Event<TEvent extends EventObject<string>> =
	| ''
	| TEvent['type']
	| TEvent

export type SimpleTransitionConfig<
	TState extends string | number | symbol,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = {
	target: TState
} & (TGuard extends undefined
	? never
	: { cond?: NonNullable<TGuard> | Array<NonNullable<TGuard>> }) &
	(TAction extends NonNullable<infer A> ? { actions?: A | Array<A> } : never)

export type HistoryTransitionConfig<
	TIgnoreState extends string | number | symbol | undefined,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = SimpleTransitionConfig<'$history', TGuard, TAction> & {
	target: '$history'
	ignore?: NonNullable<TIgnoreState>[]
}

export type TransitionConfig<
	TState extends string | number | symbol,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> =
	| SimpleTransitionConfig<Exclude<TState, '$history'>, TGuard, TAction>
	| HistoryTransitionConfig<TState, TGuard, TAction>

export type Transition<
	TState extends string | number | symbol,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> =
	| TState
	| '$history'
	| TransitionConfig<TState, TGuard, TAction>
	| TransitionConfig<TState, TGuard, TAction>[]

export type TransitionMap<
	TState extends string | number | symbol,
	TEvent extends string,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = Partial<Record<TEvent | '', Transition<TState, TGuard, TAction>>>

export type GuardFn<
	TContext extends Context,
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema
> = (
	context: TContext,
	currentState: CurrentState<TStateSchema>,
	event: TEventObject
) => Promise<boolean>
export type GuardMap<
	TContext extends Context,
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TGuard extends string | number | symbol
> = Record<
	TGuard,
	GuardFn<TContext, TEventObject | EventObject<''>, TStateSchema>
>

export type ActionFn<
	TContext extends Context,
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema
> = (
	context: TContext,
	currentState: CurrentState<TStateSchema>,
	event: TEventObject
) => Promise<Partial<TContext>>
export type ActionMap<
	TContext extends Context,
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TAction extends string | number | symbol
> = Record<
	TAction,
	ActionFn<TContext, TEventObject | EventObject<''>, TStateSchema>
>

export interface StateSchema {
	[key: string]: StateSchema | null
}

type ObjKeyOf<T> = T extends Record<string, unknown> ? keyof T : never
type NestedObjKeyOf<T> = {
	[K in keyof T]: T[K] extends Record<string, unknown>
		? ObjKeyOf<T[K]>
		: never
}[keyof T]
type NestedKeyOf<T> =
	| ObjKeyOf<T>
	| NestedObjKeyOf<T>
	| {
			[K in keyof T]: NestedObjKeyOf<T[K]>
	  }[keyof T]
// Handles 3 levels
export type State<TStateSchema extends StateSchema> = NestedKeyOf<TStateSchema>

export type LeafStateNode<
	TRootStateSchema extends StateSchema,
	TEvent extends string,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = {
	on?: TransitionMap<State<TRootStateSchema>, TEvent, TGuard, TAction>
	type?: 'default' | 'final'
} & (TAction extends NonNullable<infer A>
	? {
			entry?: Array<A>
			exit?: Array<A>
	  }
	: never)

export type StateNode<
	TRootStateSchema extends StateSchema,
	TStateSchema extends StateSchema,
	TEvent extends string,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = LeafStateNode<TRootStateSchema, TEvent, TGuard, TAction> & {
	initial: State<TStateSchema>
	states: {
		[K in keyof TStateSchema]: TStateSchema[K] extends NonNullable<
			infer TNested
		>
			? StateNode<TRootStateSchema, any, TEvent, TGuard, TAction>
			: LeafStateNode<TRootStateSchema, TEvent, TGuard, TAction>
	}
}

type LeafStatePath<TStateSchema extends StateSchema> = keyof TStateSchema
type NestedStatePath2<TStateSchema extends StateSchema> = {
	[K in keyof TStateSchema]: TStateSchema[K] extends null
		? K
		: Record<K, LeafStatePath<NonNullable<TStateSchema[K]>>>
}[keyof TStateSchema]
type NestedStatePath<TStateSchema extends StateSchema> = {
	[K in keyof TStateSchema]: TStateSchema[K] extends null
		? K
		: Record<K, NestedStatePath2<NonNullable<TStateSchema[K]>>>
}[keyof TStateSchema]
export type CurrentState<TStateSchema extends StateSchema> = {
	[K in keyof TStateSchema]: TStateSchema[K] extends null
		? K
		: Record<K, NestedStatePath<NonNullable<TStateSchema[K]>>>
}[keyof TStateSchema]

export type Machine<
	TStateSchema extends StateSchema,
	TEvent extends string,
	TGuard extends string | number | symbol | undefined = undefined,
	TAction extends string | number | symbol | undefined = undefined
> = {
	id: string
} & StateNode<TStateSchema, TStateSchema, TEvent | '', TGuard, TAction>

export type Service<
	TContext extends Context,
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = {
	machine: Machine<TStateSchema, TEventObject['type'], TGuard, TAction>
	context: TContext
	currentState: CurrentState<TStateSchema>
	history: CurrentState<TStateSchema>[]
} & (TGuard extends NonNullable<infer G>
	? { guards: GuardMap<TContext, TEventObject, TStateSchema, G> }
	: never) &
	(TAction extends NonNullable<infer A>
		? { actions: ActionMap<TContext, TEventObject, TStateSchema, A> }
		: never)
