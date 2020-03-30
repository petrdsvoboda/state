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
	CurrentState,
	GuardFn,
	ActionFn
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
		: (Object.keys(node) as any[])[0] +
				'.' +
				toStatePath((Object.values(node) as any[])[0])
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
	initialState?: CurrentState<TStateSchema>
	guards: GuardMap<TContext, TEventObject, State<TStateSchema>, TGuard>
	actions: ActionMap<TContext, TEventObject, State<TStateSchema>, TAction>
	history?: CurrentState<TStateSchema>[]
}): Service<TContext, TEventObject, TStateSchema, TGuard, TAction> {
	return {
		machine: options.machine,
		context: options.context,
		guards: options.guards,
		actions: options.actions,
		history: options.history ?? [],
		currentState: options.initialState
			? options.initialState
			: fromStatePath(options.machine.initial)
	}
}

export const sendEvent = async <
	TContext extends {},
	TEventObject extends EventObject<string>,
	TStateSchema extends StateSchema,
	TGuard extends string | number | symbol | undefined,
	TAction extends string | number | symbol | undefined
>(
	service: Service<TContext, TEventObject, TStateSchema, TGuard, TAction>,
	event: Event<TEventObject>
): Promise<Service<TContext, TEventObject, TStateSchema, TGuard, TAction>> => {
	const { machine, context, currentState, guards, actions, history } = service
	// Fix types
	const eventObject: TEventObject =
		typeof event === 'string' ? ({ type: event } as any) : event

	const statePath = toStatePath(currentState).split('.') as State<
		TStateSchema
	>[]

	const getNode = (
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
		| StateNode<
				TStateSchema,
				TStateSchema,
				TEventObject['type'],
				TGuard,
				TAction
		  >
		| LeafStateNode<TStateSchema, TEventObject['type'], TGuard, TAction>
		| undefined => {
		if (node !== undefined && 'states' in node) {
			return node.states[currState.toString()]
		} else {
			return node
		}
	}

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

	const getTransitions = (
		path: State<TStateSchema>[],
		i: number
	): TransitionConfig<State<TStateSchema>, TGuard, TAction>[] => {
		if (i > path.length) return []

		const node = path.slice(0, i).reduce(getNode, machine)
		const t = getTransitionFromNode(node)
		const config: TransitionConfig<State<TStateSchema>, TGuard, TAction>[] =
			t === undefined
				? []
				: isArray(t)
				? t
				: typeof t === 'object'
				? [t]
				: [{ target: t } as any]
		return [...getTransitions(path, i + 1), ...config]
	}

	const performTransitions = getTransitions(statePath, 0)
	// Get first transition that passes guard
	const transition = await performTransitions.reduce<
		Promise<TransitionConfig<State<TStateSchema>, TGuard, TAction> | null>
	>(async (acc, curr) => {
		const t = await acc
		if (t !== null) {
			return t
		} else if (curr.cond && guards) {
			const guard = (guards as any)[curr.cond] as GuardFn<
				TContext,
				TEventObject,
				State<TStateSchema>
			>
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

	const getInitialPath = (
		path: State<TStateSchema>[]
	): State<TStateSchema>[] => {
		const node = path.reduce(getNode, machine)
		if (node && 'initial' in node) {
			const newPath = [...path, node.initial]
			return getInitialPath(newPath)
		}
		return path
	}

	let newHistory = history
	let targetPath: State<TStateSchema>[]
	if (transition.target === '$history') {
		const historyState = [...newHistory].pop()

		if (historyState) {
			targetPath = toStatePath(historyState).split('.') as State<
				TStateSchema
			>[]
			newHistory = newHistory.slice(0, -1)
		} else {
			return service
		}
	} else {
		const target = transition.target
		targetPath = statePath.slice(0, -1)
		while (true) {
			const node = targetPath.reduce(getNode, machine)
			if (node && 'states' in node && node.states[target as any]) {
				targetPath = getInitialPath([...targetPath, target])
				break
			}

			if (targetPath.length === 0) break
			targetPath = targetPath.slice(0, -1)
		}
	}

	const leafState = statePath[statePath.length - 1]
	const targetState = targetPath[targetPath.length - 1]
	const tActions = Array.isArray(transition.actions)
		? transition.actions
		: transition.actions === undefined
		? []
		: [transition.actions]
	const getExitActions = (
		path: State<TStateSchema>[],
		i: number
	): [NonNullable<TAction>[], State<TStateSchema>][] => {
		if (i > path.length) return []

		const node = path.slice(0, i).reduce(getNode, machine)
		const exitAction = node?.exit ?? []
		return [[exitAction, leafState], ...getExitActions(path, i + 1)]
	}
	const getEntryActions = (
		path: State<TStateSchema>[],
		i: number
	): [NonNullable<TAction>[], State<TStateSchema>][] => {
		if (i > path.length) return []

		const node = path.slice(0, i).reduce(getNode, machine)
		const entryActions = node?.entry ?? []
		return [...getEntryActions(path, i + 1), [entryActions, targetState]]
	}
	const allActions: [NonNullable<TAction>[], State<TStateSchema>][] = [
		...getExitActions(statePath, 0),
		[tActions, leafState],
		...getEntryActions(targetPath, 0)
	]

	const applyAction = (state: State<TStateSchema>) => async (
		acc: Promise<TContext>,
		curr: NonNullable<TAction>
	): Promise<TContext> => {
		const prev = await acc
		if (!actions) return prev

		try {
			const updatedContext = (await (actions as any)[curr](
				prev,
				state,
				eventObject
			)) as ActionFn<TContext, TEventObject, State<TStateSchema>>
			return Object.assign(prev, updatedContext)
		} catch (err) {
			throw new EventError(eventObject.type, curr.toString(), err)
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
	const newContext = await allActions.reduce(
		async (acc, [actions, state]) =>
			await applyActions(actions, state, await acc),
		Promise.resolve(context)
	)

	// Successfull transition
	const newState = fromStatePath<TStateSchema>(targetPath.join('.'))
	let newService = {
		...service,
		context: newContext,
		currentState: newState,
		history: newHistory
	}

	// Apply auto transitions
	newService = await sendEvent(newService, '')

	if (transition.target !== '$history') {
		newService.history = [
			...newService.history.slice(0, newHistory.length),
			currentState,
			...newService.history.slice(newHistory.length)
		]
	}

	return newService
}

export default Service
