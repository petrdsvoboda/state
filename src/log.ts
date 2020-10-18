import {
	ActionTuple,
	AnyEventObject,
	AnyTransitionConfig,
	Context
} from './types'

const prefix = '== STATE ==\t'

const from = (
	show: boolean,
	data: { eventObject: AnyEventObject; currentState: any }
): void => {
	if (!show) return
	console.log(`${prefix}Event:\t\t\t${data.eventObject.type}`)
	console.log(`${prefix}From:\t\t\t${data.currentState}`)
}

const possible = (
	show: boolean,
	data: { transitions: AnyTransitionConfig[] }
): void => {
	if (!show) return
	console.log(
		`${prefix}Possible transitions:\t${JSON.stringify(data.transitions)}`
	)
}

const chosen = (
	show: boolean,
	data: { transition: AnyTransitionConfig }
): void => {
	if (!show) return
	console.log(
		`${prefix}Chosen transitions:\t${JSON.stringify(data.transition)}`
	)
}

const actions = (
	show: boolean,
	data: { actionTuples: ActionTuple[] }
): void => {
	if (!show) return
	const actionString = data.actionTuples.map(([actions, state]) => [
		actions,
		state
	])
	console.log(`${prefix}Actions:\t\t${JSON.stringify(actionString)}`)
}

const context = (show: boolean, data: { context: Context }): void => {
	if (!show) return
	console.log(`${prefix}Context:\t\t${JSON.stringify(data.context)}`)
}

const to = (
	show: boolean,
	data: { history: string[]; currentState: any }
): void => {
	if (!show) return
	console.log(`${prefix}History:\t\t${JSON.stringify(data.history)}`)
	console.log(`${prefix}To:\t\t\t${data.currentState}`)
}

const log = { from, possible, chosen, actions, context, to }
export default log
