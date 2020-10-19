import {
	AnyEventObject,
	Context,
	Service,
	Schema,
	Event,
	Guard,
	Action,
	StateName,
	ServiceConfig,
	ActionTuple,
	AnyService
} from './types'
import {
	historyPath,
	stateFromPath,
	stateToPath,
	transitionPath
} from './state'
import { possibleTransitions, firstPassingTransition } from './transition'
import log from './log'
import {
	entryActions,
	exitActions,
	toActionTuple,
	transitionActions,
	performActions,
	borderActions
} from './action'

export function buildConfig<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TAction extends Action | undefined = undefined,
	TGuard extends Guard | undefined = undefined,
	TContext extends Context | undefined = undefined
>(
	options: ServiceConfig<TSchema, TEventObject, TAction, TGuard, TContext>
): ServiceConfig<TSchema, TEventObject, TAction, TGuard, TContext> {
	return options
}

export function init<
	TSchema extends Schema,
	TEventObject extends AnyEventObject,
	TAction extends Action | undefined = undefined,
	TGuard extends Guard | undefined = undefined,
	TContext extends Context | undefined = undefined
>(
	options: ServiceConfig<TSchema, TEventObject, TAction, TGuard, TContext> & {
		currentState?: StateName<TSchema>
		history?: StateName<TSchema>[]
		context?: TContext
	}
): Service<TSchema, TEventObject, TAction, TGuard, TContext> {
	return {
		...(options as any),
		history: options.history ?? ([] as any[]),
		currentState: options.currentState ?? (options.machine.initial as any)
	}
}

export async function start<T extends AnyService>(
	service: T,
	debug = false
): Promise<T> {
	const { machine, currentState } = service
	const path = stateToPath(currentState)
	const actions = (service as any).actions
	const context = (service as any).context

	const eventObject: AnyEventObject = { type: '$start' }
	log.from(debug, { eventObject, currentState })

	const actionTuples: ActionTuple[] = toActionTuple(
		borderActions(path, machine as any, 'start'),
		currentState
	)

	log.actions(debug, { actionTuples })

	// Update context using actions
	const newContext = await performActions(actionTuples, {
		actions,
		context,
		eventObject
	})
	log.context(debug, { context: newContext })

	// Successfull transition
	let newService = {
		...service,
		context: newContext
	}

	// Apply auto transitions
	newService = await sendEvent(newService, '', debug)

	log.to(debug, {
		history: newService.history,
		currentState: newService.currentState
	})

	return newService
}

export async function end<T extends AnyService>(
	service: T,
	debug = false
): Promise<T> {
	const { machine, currentState } = service
	const path = stateToPath(currentState)
	const actions = (service as any).actions
	const context = (service as any).context

	const eventObject: AnyEventObject = { type: '$end' }
	log.from(debug, { eventObject, currentState })

	const actionTuples: ActionTuple[] = toActionTuple(
		borderActions(path, machine as any, 'end'),
		currentState
	)

	log.actions(debug, { actionTuples })

	// Update context using actions
	const newContext = await performActions(actionTuples, {
		actions,
		context,
		eventObject
	})
	log.context(debug, { context: newContext })

	// Successfull transition
	let newService = {
		...service,
		context: newContext
	}

	// Apply auto transitions
	newService = await sendEvent(newService, '', debug)

	log.to(debug, {
		history: newService.history,
		currentState: newService.currentState
	})

	return newService
}

export const sendEvent = async <T extends AnyService>(
	service: T,
	event: Event<AnyEventObject>,
	debug = false
): Promise<T> => {
	const { machine, currentState, history } = service
	const path = stateToPath(currentState)
	const actions = (service as any).actions
	const guards = (service as any).guards
	const context = (service as any).context

	const eventObject: AnyEventObject =
		typeof event === 'string' ? { type: event } : event
	log.from(debug, { eventObject, currentState })

	// Find all possible transitions
	// Starting from the most specific state
	const transitions = possibleTransitions(
		path,
		machine as any,
		eventObject.type
	)
	log.possible(debug, { transitions })

	// Choose the first transition that passes guards
	const transition = await firstPassingTransition(transitions, guards, {
		context,
		currentState,
		eventObject
	})
	if (transition === undefined) return service
	log.chosen(debug, { transition })

	let newHistory = history
	let targetPath: string[]
	if (transition.target === '$history') {
		const res = historyPath(transition as any, history as any[])
		if (!res) return service
		targetPath = res.path
		newHistory = res.history as any[]
	} else {
		targetPath = transitionPath(transition, path, machine as any)
	}
	const targetState = stateFromPath(targetPath)

	const actionTuples: ActionTuple[] = [
		...toActionTuple(exitActions(path, machine as any), currentState),
		...toActionTuple(transitionActions(transition), currentState),
		...toActionTuple(entryActions(targetPath, machine as any), targetState)
	]
	log.actions(debug, { actionTuples })

	// Update context using actions
	const newContext = await performActions(actionTuples, {
		actions,
		context,
		eventObject
	})
	log.context(debug, { context: newContext })

	// Successfull transition
	let newService = {
		...service,
		context: newContext,
		currentState: targetState,
		history: newHistory
	}

	// Apply auto transitions
	newService = await sendEvent(newService, '', debug)

	if (transition.target !== '$history') {
		newService.history = [
			...newService.history.slice(0, newHistory.length),
			currentState,
			...newService.history.slice(newHistory.length)
		]
	}

	log.to(debug, {
		history: newService.history,
		currentState: newService.currentState
	})

	return newService
}
