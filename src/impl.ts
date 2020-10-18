import { init, sendEvent } from './service'
import { Machine, ActionMap, GuardMap, ServiceConfig } from './types'

type SimpleEvents = 'do' | 'back' | 'complete' | 'restart'
type CustomEvents = { type: 'addPayload'; payload: { counter: number } }
type Event = { type: SimpleEvents } | CustomEvents
type Guard = 'canDo' | 'canDo2'
type Action = 'set' | 'inc' | 'delete' | 'fail' | 'globSet'

type Schema = {
	new: null
	state1: null
	state2: null
	state3: null
	state4: null
	state5: null
	state6: null
	state7: null
	state8: null
	state9: null
	done: null
}

const machine: Machine<Schema, Event['type'], Action, Guard> = {
	id: 'test',
	initial: 'new',
	states: {
		new: {
			on: {
				do: [{ target: 'state1', cond: 'canDo' }, { target: 'state2' }],
				complete: { target: 'done' }
			}
		},
		state1: {
			on: {
				complete: { target: 'state3' },
				do: 'state2',
				back: { target: 'new', cond: 'canDo' }
			}
		},
		state2: {
			on: {
				do: { target: 'state3', actions: ['inc'] },
				addPayload: { target: 'state3', actions: ['set'] }
			}
		},
		state3: {},
		state4: {
			on: {
				'': { target: 'state5', actions: ['set'] },
				do: { target: 'state4', actions: ['fail'] }
			}
		},
		state5: { on: { '': { target: 'done', actions: ['inc'] } } },
		state6: { on: { do: { target: 'state7' } } },
		state7: {
			on: { do: { target: 'state6' } },
			exit: ['inc'],
			entry: ['inc']
		},
		state8: {
			on: {
				do: { target: 'done', actions: ['inc'] },
				back: { target: 'done' }
			},
			exit: ['set']
		},
		state9: {
			on: { do: { target: 'done', cond: ['canDo', 'canDo2'] } }
		},
		done: { entry: ['set'] }
	},
	on: { restart: { target: 'new' } },
	entry: ['globSet'],
	exit: ['globSet']
}
type Context = {
	counter?: number
}
const guards: GuardMap<Schema, Event, Guard, Context> = {
	canDo: ({ context: { counter } }) => Promise.resolve(counter === 1),
	canDo2: () => Promise.resolve(true)
}
const actions: ActionMap<Schema, Event, Action, Context> = {
	set: ({ context, currentState, event }) => {
		if (currentState === 'done' && event.type === 'back') {
			return Promise.resolve({ counter: 1 })
		} else if (currentState === 'done') {
			return Promise.resolve(context)
		} else {
			return Promise.resolve({
				counter: event.type === 'addPayload' ? event.payload.counter : 1
			})
		}
	},
	inc: ({ context: { counter } }) =>
		Promise.resolve(counter ? { counter: counter + 1 } : { counter: 1 }),
	delete: () => Promise.resolve({}),
	fail: () => Promise.reject('fail'),
	globSet: ({ context, currentState, event: { type } }) => {
		if (
			(currentState === 'state8' && type === 'do') ||
			(currentState === 'done' && type === 'back')
		) {
			return Promise.resolve({ counter: 2 })
		} else {
			return Promise.resolve(context)
		}
	}
}
const config: ServiceConfig<Schema, Event, Action, Guard, Context> = {
	machine,
	guards,
	actions
}

export async function main(): Promise<void> {
	const service = init({
		...config,
		context: { counter: 1 },
		currentState: 'state6'
	})

	const next = await sendEvent(service, 'do', true)
	console.log(next.currentState, next.context)
}

main()
