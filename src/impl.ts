import { createService, sendEvent } from './service'
import { Machine, State, ActionMap, GuardMap } from './types'

type SimpleEvents = 'do' | 'back'
type Event = { type: SimpleEvents }
type Guard = 'canDo'
type Action = 'set' | 'inc' | 'delete'

type Schema = {
	s: { s1: null; s2: null }
	t: { t1: null; t2: null }
	u: null
}

const machine: Machine<Schema, Event['type'], Guard, Action> = {
	id: 'hierarchical',
	initial: 's',
	states: {
		s: {
			initial: 's1',
			states: {
				s1: {},
				s2: { on: { do: 'u' } }
			},
			on: {
				do: 't'
			}
		},
		t: {
			initial: 't1',
			states: {
				t1: {},
				t2: { on: { do: 's' } }
			},
			on: {
				do: 't'
			}
		},
		u: {}
	},
	on: { do: { target: 's2' } },
	entry: ['set'],
	exit: ['set']
}
type Context = {
	counter: number
}
const context: Context = { counter: 0 }
const guards: GuardMap<Context, Event, State<Schema>, Guard> = {
	canDo: ({ counter }) => Promise.resolve(counter === 1)
}
const actions: ActionMap<Context, Event, State<Schema>, Action> = {
	set: (context, state, event) => {
		if (state === 's' && event.type === 'back') {
			return Promise.resolve({ counter: 1 })
		} else if (state === 's') {
			return Promise.resolve(context)
		} else {
			return Promise.resolve({
				counter: context.counter + 1
			})
		}
	},
	inc: ({ counter }) => Promise.resolve({ counter: counter + 1 }),
	delete: () => Promise.resolve({ counter: 0 })
}
const baseService = createService({
	machine,
	context,
	guards,
	actions
})

export async function main(): Promise<void> {
	const service = createService({
		...baseService,
		context: { counter: 1 },
		initialState: { t: 't2' }
	})

	const next = await sendEvent(service, 'do')
	console.log(next.currentState, next.context)
}

main()
