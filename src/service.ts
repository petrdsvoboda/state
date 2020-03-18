import {
	Service,
	ServiceOptions,
	Transition,
	GuardMap,
	ActionMap,
	Event,
	StateData,
	Machine
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
		guards?: GuardMap<C, S, E, G, ET, EP>
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

	const statePath = currentState.split('.') as S[]

	// const getMachineLevel = (
	// 	path: S[],
	// 	machine: StateData<S, E['type'], G, A> | Machine<S, E['type'], G, A>
	// ): StateData<S, E['type'], G, A> => {
	// 	const currLevel = path.reduce((acc, curr) => {
	// 		'id' in acc ? acc.states[curr] : acc
	// 		return acc
	// 	}, machine)
	// 	return currLevel
	// }
	type PerformTransaction =
		| Transition<S, G, A>
		| Transition<S, G, A>[]
		| undefined
	let perform: PerformTransaction
	perform = statePath.reduce<
		| Transition<S, G, A>
		| Transition<S, G, A>[]
		| undefined
		| StateData<S, E['type'], G, A>
		| Machine<S, E['type'], G, A>
	>(
		(acc, curr) =>
			acc === undefined || 'target' in acc || Array.isArray(acc)
				? acc
				: 'id' in acc
				? acc.states[curr]
				: acc.on?.[regEvent.type],
		machine
	)
	if (perform === undefined) perform = machine.on?.[regEvent.type]
	if (perform === undefined) return service

	const performTransitions = isArray(perform) ? perform : [perform]

	// Get first transition that passes guard
	const transition = await performTransitions.reduce<
		Promise<Transition<S, G, A> | null>
	>(async (acc, curr) => {
		if (acc !== null) {
			return acc
		} else if (curr.cond && guards) {
			const guard = guards[curr.cond]
			return (await guard(context, currentState, regEvent)) ? curr : null
		} else {
			return curr
		}
	}, Promise.resolve(null))
	if (transition === null) return service

	const applyAction = (state: S) => async (
		acc: Promise<C>,
		curr: NonNullable<A>
	): Promise<C> => {
		const prev = await acc
		if (!actions) return prev

		try {
			const updatedContext = await actions[curr](prev, state, regEvent)
			return Object.assign(prev, updatedContext)
		} catch (err) {
			throw new EventError(regEvent.type, curr, err)
		}
	}

	const applyActions = async (
		actions: NonNullable<A>[] | undefined,
		state: S,
		context: C
	): Promise<C> => {
		if (actions === undefined) return context

		return await actions.reduce<Promise<C>>(
			applyAction(state),
			Promise.resolve(context)
		)
	}

	// Update context using actions
	const actionData: [NonNullable<A>[] | undefined, S][] = [
		[machine.exit, currentState],
		[machine.states[currentState].exit, currentState],
		[transition.actions, currentState],
		[machine.states[transition.target].entry, transition.target],
		[machine.entry, transition.target]
	]
	const newContext = await actionData.reduce(
		async (acc, [actions, state]) =>
			await applyActions(actions, state, await acc),
		Promise.resolve(context)
	)

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
