import {
	Service,
	Transition,
	StateNode,
	LeafStateNode,
	State,
	StateSchema,
	Event,
	EventObject,
	TransitionConfig,
	Machine,
	GuardMap,
	ActionMap,
	CurrentState
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

export const fromStatePath = <TStateSchema extends StateSchema>(
	path: string | number | symbol
): CurrentState<TStateSchema> => {
	return path
		.toString()
		.split('.')
		.reverse()
		.reduce<object | string | undefined>(
			(acc, curr) => (acc === undefined ? curr : { [curr]: acc }),
			undefined
		) as CurrentState<TStateSchema>
}

export const toStatePath = <TStateSchema extends StateSchema>(
	node: CurrentState<TStateSchema>
): string => {
	return typeof node === 'string'
		? node
		: node + '.' + toStatePath((Object.keys(node) as any[])[0])
}

export function createService<
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
>(options: {
	machine: Machine<TStateSchema, TEventObject['type'], TGuard, TAction>
	context: TContext
	initialState?: State<TStateSchema>
	guards: GuardMap<TContext, TEventObject, State<TStateSchema>, TGuard>
	actions: ActionMap<TContext, TEventObject, State<TStateSchema>, TAction>
}): Service<TContext, TEventObject, TStateSchema, TGuard, TAction> {
	return {
		machine: options.machine,
		context: options.context,
		guards: options.guards,
		actions: options.actions,
		currentState: options.initialState
			? fromStatePath(options.initialState)
			: fromStatePath(options.machine.initial)
	}
}

export const sendEvent = async <
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TGuard extends string,
	TAction extends string
>(
	service: Service<TContext, TEventObject, TStateSchema, TGuard, TAction>,
	event: Event<TEventObject>
): Promise<Service<TContext, TEventObject, TStateSchema, TGuard, TAction>> => {
	const { machine, context, currentState, guards, actions } = service
	// Fix types
	const eventObject: TEventObject =
		typeof event === 'string' ? ({ type: event } as any) : event

	const statePath = toStatePath(currentState).split('.') as State<
		TStateSchema
	>[]

	const getLeafNode = (
		node:
			| StateNode<
					TStateSchema,
					TStateSchema,
					TEventObject['type'],
					TGuard,
					TAction
			  >
			| LeafStateNode<TStateSchema, TEventObject['type'], TGuard, TAction>
			| undefined,
		currState: State<TStateSchema>
	):
		| LeafStateNode<TStateSchema, TEventObject['type'], TGuard, TAction>
		| undefined => {
		if (node !== undefined && 'states' in node) {
			return node.states[currState.toString()]
		} else {
			return node
		}
	}

	const stateNode = statePath.reduce(getLeafNode, machine)

	const getTransitionFromNode = (
		node:
			| LeafStateNode<TStateSchema, TEventObject['type'], TGuard, TAction>
			| undefined
	): Transition<State<TStateSchema>, TGuard, TAction> | undefined => {
		return typeof node === 'object'
			? node.on?.[
					typeof event === 'string'
						? event
						: (event.type as TEventObject['type'])
			  ]
			: node
	}

	type PerformTransaction =
		| Transition<State<TStateSchema>, TGuard, TAction>
		| undefined
	let perform: PerformTransaction = getTransitionFromNode(stateNode)
	if (perform === undefined)
		perform = machine.on?.[eventObject.type as TEventObject['type']]
	if (perform === undefined) return service

	const performTransitions: TransitionConfig<
		State<TStateSchema>,
		TGuard,
		TAction
	>[] = isArray(perform)
		? perform
		: typeof perform === 'object'
		? [perform]
		: [{ target: perform } as any]

	// Get first transition that passes guard
	const transition = await performTransitions.reduce<
		Promise<TransitionConfig<State<TStateSchema>, TGuard, TAction> | null>
	>(async (acc, curr) => {
		const t = await acc
		if (t !== null) {
			return t
		} else if (curr.cond && guards) {
			const guard = guards[curr.cond]
			return (await guard(
				context,
				statePath[statePath.length - 1],
				eventObject
			))
				? curr
				: null
		} else {
			return curr
		}
	}, Promise.resolve(null))
	if (transition === null) return service

	// const getTransitionNode = statePath
	// 	.slice(0, -1)
	// 	.reverse()
	// 	.reduce(
	// 		(acc, curr) => {

	// 			return acc
	// 		},
	// 		{ actions: [] }
	// 	)

	const applyAction = (state: State<TStateSchema>) => async (
		acc: Promise<TContext>,
		curr: NonNullable<TAction>
	): Promise<TContext> => {
		const prev = await acc
		if (!actions) return prev

		try {
			const updatedContext = await actions[curr](prev, state, eventObject)
			return Object.assign(prev, updatedContext)
		} catch (err) {
			throw new EventError(eventObject.type, curr, err)
		}
	}

	const applyActions = async (
		actions: NonNullable<TAction>[] | undefined,
		state: State<TStateSchema>,
		context: TContext
	): Promise<TContext> => {
		if (actions === undefined) return context

		return await actions.reduce<Promise<TContext>>(
			applyAction(state),
			Promise.resolve(context)
		)
	}

	// Update context using actions
	const tActions = Array.isArray(transition.actions)
		? transition.actions
		: transition.actions === undefined
		? undefined
		: [transition.actions]
	const actionData: [
		NonNullable<TAction>[] | undefined,
		State<TStateSchema>
	][] = [
		[machine.exit, currentState],
		[machine.states[currentState.toString()].exit, currentState],
		[tActions, currentState],
		[machine.states[transition.target.toString()].entry, transition.target],
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
