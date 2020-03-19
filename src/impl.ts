import { createService, sendEvent } from './service'
import { Machine, State, ActionMap, GuardMap } from './types'

type SimpleEvents = 'do' | 'back' | 'complete' | 'restart'
type CustomEvents = { type: 'addPayload'; payload: { counter: number } }
type Event = { type: SimpleEvents } | CustomEvents
type Guard = 'canDo'
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
	done: null
}

const machine: Machine<Schema, Event['type'], Guard, Action> = {
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
		done: { entry: ['set'] }
	},
	on: { restart: { target: 'new' } },
	entry: ['globSet'],
	exit: ['globSet']
}
type Context = {
	counter?: number
}
const context: Context = {}
const guards: GuardMap<Context, Event, State<Schema>, Guard> = {
	canDo: ({ counter }) => Promise.resolve(counter === 1)
}
const actions: ActionMap<Context, Event, State<Schema>, Action> = {
	set: (context, state, event) => {
		if (state === 'done' && event.type === 'back') {
			return Promise.resolve({ counter: 1 })
		} else if (state === 'done') {
			return Promise.resolve(context)
		} else {
			return Promise.resolve({
				counter: event.type === 'addPayload' ? event.payload.counter : 1
			})
		}
	},
	inc: ({ counter }) =>
		Promise.resolve(counter ? { counter: counter + 1 } : { counter: 1 }),
	delete: () => Promise.resolve({}),
	fail: () => Promise.reject('fail'),
	globSet: (context, state, { type }) => {
		if (
			(state === 'state8' && type === 'do') ||
			(state === 'done' && type === 'back')
		) {
			return Promise.resolve({ counter: 2 })
		} else {
			return Promise.resolve(context)
		}
	}
}
const baseService = createService({
	machine,
	context,
	guards,
	actions
})

export async function main(): Promise<void> {
	console.log(await (await sendEvent(baseService, 'complete')).currentState)
}

main()
