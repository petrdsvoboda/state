import {
	ActionTuple,
	AnyEventObject,
	AnyTransitionConfig,
	Context
} from './types'
import { isArray } from './utils'

const prefix = ''

const from = (
	show: boolean,
	data: { eventObject: AnyEventObject; currentState: any }
): void => {
	if (!show) return
	let event = data.eventObject.type
	if (event === '') event = '$auto'

	console.log(`${prefix}${data.currentState}\t⟼\t${event}`)
}

const possible = (
	show: boolean,
	data: { transitions: AnyTransitionConfig[] }
): void => {
	if (!show) return
	for (const { target, cond } of data.transitions) {
		const condString = cond
			? `\t? ${isArray(cond) ? cond.join(', ') : cond}`
			: ''

		console.log(`${prefix}\t\t\t?⇥ \t${target}${condString}`)
	}
}

const chosen = (
	show: boolean,
	data: { transition: AnyTransitionConfig }
): void => {
	if (!show) return
	const { target } = data.transition
	console.log(`${prefix}\t\t\t\x1b[32m!\x1b[0m⇥ \t${target}`)
}

const actions = (
	show: boolean,
	data: { actionTuples: ActionTuple[] }
): void => {
	if (!show) return
	for (const [action, state] of data.actionTuples) {
		console.log(`${prefix}\t»  ${action} (${state})`)
	}
}

const context = (show: boolean, data: { context: Context }): void => {
	if (!show) return
	console.log(`${prefix}\t= ${JSON.stringify(data.context)}`)
}

const to = (
	show: boolean,
	data: { history: string[]; currentState: any }
): void => {
	if (!show) return
	console.log(`${prefix}\tHistory: ${data.history.join(', ')}`)
	console.log(`${prefix}⇥  ${data.currentState}`)
}

const log = { from, possible, chosen, actions, context, to }
export default log
