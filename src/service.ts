import { Machine, Service, Transition, GuardMap, ActionMap } from './types'

const isNonNullable = <T>(arg: T): arg is NonNullable<T> =>
	arg !== null && arg !== undefined

const isArray = <T>(arg: T | T[]): arg is T[] => Array.isArray(arg)

export const createService = <
	M extends Machine<S, E, G, A>,
	C extends {},
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
>(
	machine: M,
	context: C,
	guards: GuardMap<G, C, S>,
	actions: ActionMap<A, C, S>
): Service<M, C, S, E, G, A> => ({
	machine,
	context,
	currentState: machine.initial,
	guards,
	actions
})

export const sendEvent = <
	M extends Machine<S, E, G, A>,
	C extends {},
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
>(
	service: Service<M, C, S, E, G, A>,
	event: E | ''
): Service<M, C, S, E, G, A> => {
	const { machine, context, currentState } = service

	let perform: Transition<S, G, A> | Transition<S, G, A>[] | undefined =
		machine.states[currentState].on?.[event]
	if (perform === undefined) perform = machine.on?.[event]
	if (perform === undefined) return service

	const performTransitions = isArray(perform) ? perform : [perform]

	// Get first transition that passes guard
	const transition = performTransitions.reduce<Transition<S, G, A> | null>(
		(acc, curr) =>
			acc !== null
				? acc
				: isNonNullable(curr.cond) &&
				  isNonNullable(service.guards) &&
				  service.guards[curr.cond](context, currentState) === true
				? curr
				: null,
		null
	)
	if (transition === null) return service

	// Update context using actions
	let newContext = context
	if (isNonNullable(transition.actions) && isNonNullable(service.actions)) {
		newContext = Object.assign(
			context,
			service.actions[transition.actions](context, currentState)
		)
	}

	// Successfull transition
	const newState = transition.target

	return {
		...service,
		context: newContext,
		currentState: newState
	}
}

export default Service
