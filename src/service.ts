import {
	Service,
	ServiceOptions,
	Transition,
	GuardMap,
	ActionMap
} from './types'

const isNonNullable = <T>(arg: T): arg is NonNullable<T> =>
	arg !== null && arg !== undefined

const isArray = <T>(arg: T | T[]): arg is T[] => Array.isArray(arg)

export function createService<
	C extends {},
	S extends string,
	E extends string,
	G extends undefined,
	A extends undefined
>(
	options: Omit<ServiceOptions<C, S, E, G, A>, 'guards' | 'actions'>
): Service<C, S, E, undefined, undefined>
export function createService<
	C extends {},
	S extends string,
	E extends string,
	G extends string,
	A extends undefined
>(
	options: Omit<ServiceOptions<C, S, E, G, A>, 'actions'>
): Service<C, S, E, G, undefined>
export function createService<
	C extends {},
	S extends string,
	E extends string,
	G extends undefined,
	A extends string
>(
	options: Omit<ServiceOptions<C, S, E, G, A>, 'guards'>
): Service<C, S, E, undefined, A>
export function createService<
	C extends {},
	S extends string,
	E extends string,
	G extends string,
	A extends string
>(options: ServiceOptions<C, S, E, G, A>): Service<C, S, E, G, A>
export function createService<
	C extends {},
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
>(
	options: Omit<ServiceOptions<C, S, E, G, A>, 'guards' | 'actions'> & {
		guards?: GuardMap<C, S, G>
		actions?: ActionMap<C, S, A>
	}
): Service<C, S, E, G, A> {
	return {
		machine: options.machine,
		context: options.context,
		// TODO: Proper typing
		guards: options.guards as any,
		actions: options.actions as any,
		currentState: options.initialState ?? options.machine.initial
	}
}

export const sendEvent = <
	C extends {},
	S extends string,
	E extends string,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined
>(
	service: Service<C, S, E, G, A>,
	event: E | ''
): Service<C, S, E, G, A> => {
	const { machine, context, currentState, guards, actions } = service

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
				: !isNonNullable(curr.cond) || !isNonNullable(guards)
				? curr
				: guards[curr.cond](context, currentState) === true
				? curr
				: null,
		null
	)
	if (transition === null) return service

	// Update context using actions
	let newContext = context
	if (isNonNullable(transition.actions) && isNonNullable(actions)) {
		newContext = transition.actions.reduce(
			(acc, curr) => Object.assign(acc, actions[curr](acc, currentState)),
			context
		)
	}

	// Successfull transition
	const newState = transition.target
	const newService = {
		...service,
		context: newContext,
		currentState: newState
	}

	return newService
}

export default Service
