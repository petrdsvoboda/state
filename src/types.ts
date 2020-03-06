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

export type ActionMap<
	C extends {},
	S extends string,
	A extends string | undefined = undefined
> = A extends undefined
	? undefined
	: Record<NonNullable<A>, (context: C, currentState: S) => C>

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
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = {
	machine: Machine<S, E, G, A>
	context: C
	initialState?: S
	guards: GuardMap<C, S, G>
	actions: ActionMap<C, S, A>
}

export type Service<
	C extends {},
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = {
	machine: Machine<S, E, G, A>
	context: C
	currentState: S
	guards: GuardMap<C, S, G>
	actions: ActionMap<C, S, A>
}
