import { EventError } from './error'
import { getNode } from './state'
import {
	Action,
	ActionTuple,
	AnyStateNode,
	Context,
	StateName,
	AnyActionMap,
	AnyEventObject
} from './types'
import { AnyTransitionConfig } from './types/transition'
import { isArray } from './utils'

export const transitionActions = (
	transition: AnyTransitionConfig
): Action[] => {
	const { actions } = transition
	if (actions === undefined) return []
	else if (isArray(actions)) return actions
	else return [actions]
}

export const exitActions = (path: string[], root: AnyStateNode): Action[] => {
	const actions: Action[] = []
	for (let index = 0; index <= path.length; index++) {
		const nodePath = path.slice(0, index)
		const node = getNode(nodePath, root)
		if (!node?.exit) continue

		actions.push(...node.exit)
	}
	return actions
}

export const entryActions = (path: string[], root: AnyStateNode): Action[] => {
	const actions: Action[] = []
	for (let index = 0; index <= path.length; index++) {
		const nodePath = path.slice(0, index)
		const node = getNode(nodePath, root)
		if (!node?.entry) continue

		actions.unshift(...node.entry)
	}
	return actions
}

export const toActionTuple = (
	actions: Action[],
	state: StateName<any>
): ActionTuple[] => actions.map(a => [a, state])

export const performActions = async (
	actionTuples: ActionTuple[],
	options: {
		actions: AnyActionMap
		context: Context
		eventObject: AnyEventObject
	}
): Promise<Context> => {
	const { actions, context, eventObject } = options
	if (!actions) return context // FIXME handle this somewhere else

	let newContext = context
	for (const [action, state] of actionTuples) {
		try {
			newContext = await actions[action]({
				context: newContext,
				currentState: state,
				event: eventObject
			})
		} catch (err) {
			throw new EventError(eventObject.type, action, err)
		}
	}
	return newContext
}
