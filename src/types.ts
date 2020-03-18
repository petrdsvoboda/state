export type EventObject<TType extends string> = {
	type: TType
}
export type EventWithPayload<TType extends string, TPayload> = EventObject<
	TType
> & {
	payload: TPayload
}
export type Event<TEvent extends EventObject<TType>, TType extends string> =
	| TEvent['type']
	| TEvent

export type TransitionConfig<
	TState extends string | number | symbol,
	TGuard extends string | undefined,
	TAction extends string | undefined
> = {
	target: TState
	cond: NonNullable<TGuard>
	actions?: NonNullable<TAction> | NonNullable<TAction>[]
}

export type Transition<
	TState extends string | number | symbol,
	TGuard extends string | undefined,
	TAction extends string | undefined
> =
	| TState
	| TransitionConfig<TState, TGuard, TAction>
	| TransitionConfig<TState, TGuard, TAction>[]

export type TransitionMap<
	TState extends string | number | symbol,
	TEvent extends string,
	TGuard extends string | undefined,
	TAction extends string | undefined
> = Partial<Record<TEvent | '', Transition<TState, TGuard, TAction>>>

export type GuardMap<
	C extends {},
	S extends string,
	E extends Event<ET | '', EP>,
	G extends string | undefined = undefined,
	ET extends string = string,
	EP extends {} | undefined = {}
> = G extends undefined
	? undefined
	: Record<
			NonNullable<G>,
			(context: C, currentState: S, event: E) => Promise<boolean>
	  >

export type ActionFn<
	C extends {},
	S extends string,
	E extends Event<ET | '', EP>,
	ET extends string = string,
	EP extends {} | undefined = {}
> = (context: C, currentState: S, event: E) => Promise<Partial<C>>
export type ActionMap<
	C extends {},
	S extends string,
	E extends Event<ET | '', EP>,
	A extends string | undefined = undefined,
	ET extends string = string,
	EP extends {} | undefined = {}
> = A extends undefined
	? undefined
	: Record<NonNullable<A>, ActionFn<C, S, E, ET, EP>>

type StateSchemaMap<T> = T extends object ? StateSchema : {}
export type StateSchema = {
	[key: string]: StateSchemaMap<{}>
}

const state: StateSchema = {
	ok: { dok: {} },
	pk: {}
}

type SSS = State<typeof state>

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
type NestedFlatten<T> = SimpleFlatten<
	SimpleFlatten<SimpleFlatten<SimpleFlatten<SimpleFlatten<T>>>>
>
export type State<TStateSchema extends StateSchema> = keyof NestedFlatten<
	TStateSchema
>

type StateNode<
	TStateSchema extends StateSchema,
	TEvent extends string,
	TGuard extends string | undefined = undefined,
	TAction extends string | undefined = undefined,
	TState = State<TStateSchema>
> = {
	initial: TState
	states: TStateSchema extends never
		? never
		: {
				[K in State<TStateSchema>]: StateNode<
					TStateSchema[K],
					TEvent,
					TGuard,
					TAction
				>
		  }
	on?: TransitionMap<TState, TEvent, TGuard, TAction>
	entry?: NonNullable<TAction>[]
	exit?: NonNullable<TAction>[]
	type?: 'default' | 'final'
}

export type Machine<
	TStateSchema extends StateSchema,
	TEvent extends string,
	TGuard extends string | undefined = undefined,
	TAction extends string | undefined = undefined
> = {
	id: string
	states: Record<
		TState,
		| StateData<TState, TEvent, TGuard, TAction>
		| Machine<TState, TEvent, TGuard, TAction>
	>
} & StateNode<TStateSchema, TEvent, TGuard, TAction>

export type ServiceOptions<
	TContext extends {},
	TStateSchema extends StateSchema,
	TEventObject extends EventObject,
	TGuardMap extends GuardMap | undefined = undefined,
	TActionMap extends ActionMap | undefined = undefined
> = {
	machine: Machine<S, ET, G, A>
	context: C
	initialState?: S
	guards: GuardMap<C, S, E, G, ET, EP>
	actions: ActionMap<C, S, E, A, ET, EP>
}

export type Service<
	C extends {},
	S extends string,
	E extends Event<ET | '', EP>,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined,
	ET extends string = string,
	EP extends {} | undefined = undefined
> = {
	machine: Machine<S, ET, G, A>
	context: C
	currentState: S
	guards: GuardMap<C, S, E, G, ET, EP>
	actions: ActionMap<C, S, E, A, ET, EP>
}
