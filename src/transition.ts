import { getNode } from './state'
import {
	AnyEventObject,
	AnyGuardMap,
	AnyMachine,
	AnyTransitionConfig,
	Context,
	Guard
} from './types'
import { isArray } from './utils'

export const possibleTransitions = (
	path: string[],
	root: AnyMachine,
	event: string
): AnyTransitionConfig[] => {
	const transitions: AnyTransitionConfig[] = []
	for (let index = 0; index <= path.length; index++) {
		const nodePath = path.slice(0, index)
		const node = getNode(nodePath, root)
		if (!node) continue

		const data = node.on?.[event]
		if (!data) continue

		let ts: AnyTransitionConfig[]
		if (isArray(data)) {
			ts = data
		} else if (typeof data === 'object') {
			ts = [data]
		} else {
			ts = [{ target: data }]
		}
		transitions.unshift(...ts)
	}
	return transitions
}

export const firstPassingTransition = async (
	transitions: AnyTransitionConfig[],
	guards: AnyGuardMap,
	options: {
		context: Context
		currentState: any
		eventObject: AnyEventObject
	}
): Promise<AnyTransitionConfig | undefined> => {
	const { context, currentState, eventObject } = options

	for (const transition of transitions) {
		const { cond } = transition
		if (!cond) return transition

		const conditions = (isArray(cond) ? cond : [cond]) as Guard[]
		const results = await Promise.all(
			conditions.map(c =>
				guards[c]({ context, currentState, event: eventObject } as any)
			)
		)

		if (results.every(res => res)) return transition
	}

	return
}
