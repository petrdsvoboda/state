import { createService, sendEvent } from './service'
import {
	Machine,
	ActionMap,
	GuardMap,
	EventObject,
	EventObjectWithPayload
} from './types'

type SimpleEvents = 'do' | 'back'
type Event =
	| EventObject<SimpleEvents>
	| EventObjectWithPayload<'pay', { dingding: number }>
type Guard = 'canDo' | 'canDo2'
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
				s2: { on: { do: { target: 'u' } } }
			},
			on: {
				do: 't'
			}
		},
		t: {
			initial: 't1',
			states: {
				t1: {},
				t2: {
					on: {
						do: { target: 's', cond: ['canDo', 'canDo2'] }
					}
				}
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
const guards: GuardMap<Context, Event, Schema, Guard> = {
	canDo: ({ counter }) => Promise.resolve(counter === 1),
	canDo2: () => Promise.resolve(true)
}
const actions: ActionMap<Context, Event, Schema, Action> = {
	set: context => {
		return Promise.resolve({
			counter: context.counter + 1
		})
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
		...(baseService as any),
		context: { counter: 2 },
		initialState: { t: 't2' }
	})

	const next = await sendEvent(service, 'do', true)
	console.log(next.currentState, next.context)
}

main()
