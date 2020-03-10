export type BaseEvent<T extends string> = {
	type: T
}
export type EventWithPayload<T extends string, P> = BaseEvent<T> & {
	payload: P
}
export type Event<T extends string, P> = BaseEvent<T> | EventWithPayload<T, P>

export type Transition<
	S extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = {
	target: S
	cond?: NonNullable<G>
	actions?: NonNullable<A>[]
}

export type TransitionMap<
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = Partial<Record<E | '', Transition<S, G, A> | Transition<S, G, A>[]>>

export type GuardMap<
	C extends {},
	S extends string,
	G extends string | undefined = undefined
> = G extends undefined
	? undefined
	: Record<NonNullable<G>, (context: C, currentState: S) => boolean>

export type ActionFn<
	C extends {},
	S extends string,
	E extends Event<ET | '', EP>,
	ET extends string = string,
	EP extends {} | undefined = {}
> = (context: C, currentState: S, event: E) => Promise<C>
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

export type Machine<
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = {
	initial: S
	states: Record<S, { on?: TransitionMap<S, E, G, A> }>
	on?: TransitionMap<S, E, G, A>
}

export type ServiceOptions<
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
	initialState?: S
	guards: GuardMap<C, S, G>
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
	guards: GuardMap<C, S, G>
	actions: ActionMap<C, S, E, A, ET, EP>
}
