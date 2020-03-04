export type Transition<
	S extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = {
	target: S
	cond?: G
	actions?: A
}

export type TransitionMap<
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = Record<E | '', Transition<S, G, A>[]>

export type GuardMap<
	G extends string | undefined,
	C extends {},
	S extends string
> = G extends undefined
	? undefined
	: Record<NonNullable<G>, (context: C, currentState: S) => boolean>

export type ActionMap<
	A extends string | undefined,
	C extends {},
	S extends string
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
	states: Record<
		S,
		{ on?: Record<E | '', Transition<S, G, A> | Transition<S, G, A>[]> }
	>
	on?: Record<E | '', Transition<S, G, A> | Transition<S, G, A>[]>
}

export type Service<
	M extends Machine<S, E, G, A>,
	C extends {},
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
> = {
	machine: M
	context: C
	currentState: S

	actions: ActionMap<A, C, S>
	guards: GuardMap<G, C, S>
}
