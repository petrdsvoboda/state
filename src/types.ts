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

export type TransitionConfig<
	TState extends string | number | symbol,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = {
	target: TState
	cond?: NonNullable<TGuard>
	actions?: NonNullable<TAction> | NonNullable<TAction>[]
}

export type Transition<
	TState extends string | number | symbol,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> =
	| TState
	| '$history'
	| TransitionConfig<TState | '$history', TGuard, TAction>
	| TransitionConfig<TState | '$history', TGuard, TAction>[]

export type TransitionMap<
	TState extends string | number | symbol,
	TEvent extends string,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = Partial<Record<TEvent | '', Transition<TState, TGuard, TAction>>>

export type GuardFn<
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema
> = (
	context: TContext,
	currentState: CurrentState<TStateSchema>,
	event: TEventObject
) => Promise<boolean>
export type GuardMap<
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TGuard extends string | number | symbol | undefined
> = TGuard extends undefined
	? undefined
	: Record<NonNullable<TGuard>, GuardFn<TContext, TEventObject, TStateSchema>>

export type ActionFn<
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema
> = (
	context: TContext,
	currentState: CurrentState<TStateSchema>,
	event: TEventObject
) => Promise<Partial<TContext>>
export type ActionMap<
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TAction extends string | number | symbol | undefined
> = TAction extends undefined
	? undefined
	: Record<
			NonNullable<TAction>,
			ActionFn<TContext, TEventObject, TStateSchema>
	  >

export interface StateSchema {
	[key: string]: StateSchema | null
}

// https://github.com/Microsoft/TypeScript/issues/31192#issuecomment-488391189
type ObjKeyof<T> = T extends object ? keyof T : never
type KeyofKeyof<T> = ObjKeyof<T> | { [K in keyof T]: ObjKeyof<T[K]> }[keyof T]
type Lookup<T, K> = T extends any ? (K extends keyof T ? T[K] : never) : never
type SimpleFlatten<T> = T extends object
	? {
			[K in KeyofKeyof<T>]:
				| Exclude<K extends keyof T ? T[K] : never, object>
				| { [P in keyof T]: Lookup<T[P], K> }[keyof T]
	  }
	: T
type NestedFlatten<T> = SimpleFlatten<SimpleFlatten<SimpleFlatten<T>>>
// mine
type ObjKeyOf<T> = T extends object ? keyof T : never
type NestedObjKeyOf<T> = {
	[K in keyof T]: T[K] extends object ? ObjKeyOf<T[K]> : never
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
	entry?: NonNullable<TAction>[]
	exit?: NonNullable<TAction>[]
	type?: 'default' | 'final'
}

export type StateNode<
	TRootStateSchema extends StateSchema,
	TStateSchema extends StateSchema,
	TEvent extends string,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = LeafStateNode<TRootStateSchema, TEvent, TGuard, TAction> & {
	initial: State<TStateSchema>
	states: {
		[K in keyof TStateSchema]: TStateSchema[K] extends null
			? LeafStateNode<TRootStateSchema, TEvent, TGuard, TAction>
			: StateNode<
					TRootStateSchema,
					NonNullable<TStateSchema[K]>,
					TEvent,
					TGuard,
					TAction
			  >
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
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = {
	id: string
} & StateNode<TStateSchema, TStateSchema, TEvent | '', TGuard, TAction>

export type Service<
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
> = {
	machine: Machine<TStateSchema, TEventObject['type'], TGuard, TAction>
	context: TContext
	currentState: CurrentState<TStateSchema>
	guards: GuardMap<TContext, TEventObject, TStateSchema, TGuard>
	actions: ActionMap<TContext, TEventObject, TStateSchema, TAction>
	history: CurrentState<TStateSchema>[]
}
