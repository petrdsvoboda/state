import {
	Service,
	ServiceOptions,
	Transition,
	GuardMap,
	ActionMap,
	Event
} from './types'

// const isNonNullable = <T>(arg: T): arg is NonNullable<T> =>
// 	arg !== null && arg !== undefined

const isArray = <T>(arg: T | T[]): arg is T[] => Array.isArray(arg)

export class EventError extends Error {
	constructor(event: string, action: string, message: string) {
		super(`Error in action ${action} while performing ${event}: ${message}`)
		this.name = 'EventError'
	}
}

export function createService<
	C extends {},
	S extends string,
	E extends Event<ET, EP>,
	G extends undefined,
	A extends undefined,
	ET extends string = string,
	EP extends {} | undefined = undefined
>(
	options: Omit<ServiceOptions<C, S, E, G, A, ET, EP>, 'guards' | 'actions'>
): Service<C, S, E, undefined, undefined, ET, EP>
export function createService<
	C extends {},
	S extends string,
	E extends Event<ET, EP>,
	G extends string,
	A extends undefined,
	ET extends string = string,
	EP extends {} | undefined = undefined
>(
	options: Omit<ServiceOptions<C, S, E, G, A, ET, EP>, 'actions'>
): Service<C, S, E, G, undefined, ET, EP>
export function createService<
	C extends {},
	S extends string,
	E extends Event<ET, EP>,
	G extends undefined,
	A extends string,
	ET extends string = string,
	EP extends {} | undefined = undefined
>(
	options: Omit<ServiceOptions<C, S, E, G, A, ET, EP>, 'guards'>
): Service<C, S, E, undefined, A, ET, EP>
export function createService<
	C extends {},
	S extends string,
	E extends Event<ET, EP>,
	G extends string,
	A extends string,
	ET extends string = string,
	EP extends {} | undefined = undefined
>(
	options: ServiceOptions<C, S, E, G, A, ET, EP>
): Service<C, S, E, G, A, ET, EP>
export function createService<
	C extends {},
	S extends string,
	E extends Event<ET, EP>,
	G extends string,
	A extends string,
	ET extends string = string,
	EP extends {} | undefined = undefined
>(
	options: Omit<
		ServiceOptions<C, S, E, G, A, ET, EP>,
		'guards' | 'actions'
	> & {
		guards?: GuardMap<C, S, G>
		actions?: ActionMap<C, S, E, A, ET, EP>
	}
): Service<C, S, E, G, A, ET, EP> {
	return {
		machine: options.machine,
		context: options.context,
		// TODO: Proper typing
		guards: options.guards as any,
		actions: options.actions as any,
		currentState: options.initialState ?? options.machine.initial
	}
}

export const sendEvent = async <
	C extends {},
	S extends string,
	E extends Event<ET, EP>,
	G extends string | undefined = undefined,
	A extends string | undefined = undefined,
	ET extends string = string,
	EP extends {} | undefined = undefined
>(
	service: Service<C, S, E, G, A, ET, EP>,
	event: E | ET | ''
): Promise<Service<C, S, E, G, A, ET, EP>> => {
	const { machine, context, currentState, guards, actions } = service
	const regEvent: E =
		typeof event === 'string' ? ({ type: event } as E) : event

	let perform: Transition<S, G, A> | Transition<S, G, A>[] | undefined =
		machine.states[currentState].on?.[regEvent.type]
	if (perform === undefined) perform = machine.on?.[regEvent.type]
	if (perform === undefined) return service

	const performTransitions = isArray(perform) ? perform : [perform]

	// Get first transition that passes guard
	const transition = performTransitions.reduce<Transition<S, G, A> | null>(
		(acc, curr) => {
			if (acc !== null) {
				return acc
			} else if (curr.cond && guards) {
				const guard = guards[curr.cond]
				return guard(context, currentState) ? curr : null
			} else {
				return curr
			}
		},
		null
	)
	if (transition === null) return service

	const applyActions = async (
		acc: Promise<C>,
		curr: NonNullable<A>
	): Promise<C> => {
		if (!actions) return acc

		try {
			const updatedContext = await actions[curr](
				await acc,
				currentState,
				regEvent
			)
			return Object.assign(acc, updatedContext)
		} catch (err) {
			throw new EventError(regEvent.type, curr, err)
		}
	}

	// Update context using actions
	let newContext = context

	const exitActions = machine.states[currentState].exit
	if (exitActions) {
		newContext = await exitActions.reduce<Promise<C>>(
			applyActions,
			Promise.resolve(newContext)
		)
	}
	if (transition.actions) {
		newContext = await transition.actions.reduce<Promise<C>>(
			applyActions,
			Promise.resolve(newContext)
		)
	}
	const entryActions = machine.states[transition.target].entry
	if (entryActions) {
		newContext = await entryActions.reduce<Promise<C>>(
			applyActions,
			Promise.resolve(newContext)
		)
	}

	// Successfull transition
	const newState = transition.target
	let newService = {
		...service,
		context: newContext,
		currentState: newState
	}
	// Apply auto transitions
	newService = await sendEvent(newService, '')

	return newService
}

export default Service
