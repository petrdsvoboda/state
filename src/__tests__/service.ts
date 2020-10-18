import { init, sendEvent } from '../service'
import { EventError } from '../error'
import {
	Machine,
	GuardMap,
	ActionMap,
	ServiceConfig,
	StateName
} from '../types'

describe('init', () => {
	type SimpleEvents = 'complete'
	type CustomEvents = { type: 'custom' }
	type Event = { type: SimpleEvents } | CustomEvents

	type Schema = {
		new: null
		done: null
	}

	const machine: Machine<Schema, Event['type']> = {
		id: 'test',
		initial: 'new',
		states: {
			new: {},
			done: {}
		}
	}

	test('it creates simple service', () => {
		const service = init<Schema, Event>({ machine })
		expect(service).toEqual({
			machine,
			currentState: 'new',
			history: []
		} as typeof service)
	})

	test('it creates service at state', () => {
		const service = init<Schema, Event>({ machine, currentState: 'done' })
		expect(service).toEqual({
			machine,
			currentState: 'done',
			history: []
		} as typeof service)
	})

	test('it creates service with guards', () => {
		type Guard = 'applyGuard'
		const guards: GuardMap<Schema, Event, Guard> = {
			applyGuard: () => Promise.resolve(true)
		}
		const guardMachine: Machine<Schema, Event['type'], undefined, Guard> = {
			id: 'test',
			initial: 'new',
			states: {
				new: {},
				done: {}
			}
		}
		const service = init<Schema, Event, undefined, Guard>({
			machine: guardMachine,
			guards
		})
		expect(service).toEqual({
			machine,
			guards,
			currentState: 'new',
			history: []
		} as typeof service)
	})

	test('it creates service with actions', () => {
		type Action = 'applyAction'
		const actions: ActionMap<Schema, Event, Action> = {
			applyAction: () => Promise.resolve(undefined)
		}
		const actionMachine: Machine<Schema, Event['type'], Action> = {
			id: 'test',
			initial: 'new',
			states: {
				new: {},
				done: {}
			}
		}
		const service = init<Schema, Event, Action>({
			machine: actionMachine,
			actions
		})
		expect(service).toEqual({
			machine,
			actions,
			currentState: 'new',
			history: []
		})
	})
})

describe('sendEvent', () => {
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
					do: [
						{ target: 'state1', cond: 'canDo' },
						{ target: 'state2' }
					],
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
	type Context = { counter?: number }
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
					counter:
						event.type === 'addPayload' ? event.payload.counter : 1
				})
			}
		},
		inc: ({ context: { counter } }) =>
			Promise.resolve(
				counter ? { counter: counter + 1 } : { counter: 1 }
			),
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

	test('it completes simple transition', async () => {
		const service = init({
			...config,
			currentState: 'done',
			history: ['new']
		})
		expect(await sendEvent(service, 'complete')).toEqual({
			...config,
			currentState: 'done',
			history: ['new']
		})
	})

	test('it stays at state without transition', async () => {
		const service = init({
			...config,
			currentState: 'done',
			history: ['new'],
			machine: { ...config.machine, on: undefined } as typeof machine
		})
		expect(await sendEvent(service, 'back')).toEqual(service)
	})

	test('it handles global transition', async () => {
		const service = init({
			...config,
			currentState: 'state3'
		})
		expect(await sendEvent(service, 'restart')).toEqual({
			...config,
			currentState: 'new',
			history: ['state3']
		})
	})

	test('it handles auto transition', async () => {
		const service = init({
			...config,
			currentState: 'state4'
		})
		expect(await sendEvent(service, '')).toEqual({
			...config,
			currentState: 'done',
			context: { counter: 2 },
			history: ['state4', 'state5']
		})
	})

	test('it handles passed guards', async () => {
		const service = init({
			...config,
			context: { counter: 1 }
		})
		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 'state1',
			history: ['new'],
			context: { counter: 1 }
		})
	})

	test('it handles failed guards', async () => {
		// FIXME there should not be context supplied
		const service = init({
			...config,
			context: { counter: 2 }
		})
		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 'state2',
			history: ['new'],
			context: { counter: 2 }
		})
	})

	test('it handles all failed guards', async () => {
		const service = init({
			...config,
			context: { counter: 2 },
			currentState: 'state1'
		})
		expect(await sendEvent(service, 'back')).toEqual({
			...config,
			currentState: 'state1',
			context: { counter: 2 },
			history: []
		})
	})

	test('it handles multiple guards', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state9'
		})
		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 'done',
			history: ['state9'],
			context: { counter: 1 }
		})
	})

	test('it handles actions', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state2'
		})
		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 'state3',
			context: { counter: 2 },
			history: ['state2']
		})
	})

	test('it handles actions with data', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state2'
		})
		expect(
			await sendEvent(service, {
				type: 'addPayload',
				payload: { counter: 5 }
			})
		).toEqual({
			...config,
			currentState: 'state3',
			context: { counter: 5 },
			history: ['state2']
		})
	})

	test('it handles failed action', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state4'
		})

		await expect(sendEvent(service, 'do')).rejects.toThrow(
			new EventError('do', 'fail', 'fail')
		)
	})

	test('it handles entry action', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state6'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 'state7',
			context: { counter: 2 },
			history: ['state6']
		})
	})

	test('it handles exit action', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state7'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 'state6',
			context: { counter: 2 },
			history: ['state7']
		})
	})

	test('it handles global entry action', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state8'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 'done',
			context: { counter: 2 },
			history: ['state8']
		})
	})

	test('it handles global exit action', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state8'
		})

		expect(await sendEvent(service, 'back')).toEqual({
			...config,
			currentState: 'done',
			context: { counter: 2 },
			history: ['state8']
		})
	})

	test('it handles transition if no actions provided', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 'state8',
			actions: undefined as any
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			context: { counter: 1 },
			currentState: 'done',
			history: ['state8'],
			actions: undefined as any
		})
	})
})

describe('hierarchical state', () => {
	type SimpleEvents = 'do' | 'back'
	type Event = { type: SimpleEvents }
	type Guard = 'canDo'
	type Action = 'set' | 'inc' | 'delete'

	type Schema = {
		s: { s1: null; s2: null }
		t: { t1: null; t2: null }
		u: null
	}

	const machine: Machine<Schema, Event['type'], Action, Guard> = {
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
				on: { do: 't' }
			},
			u: {}
		},
		on: { do: { target: 's.s2' } },
		entry: ['set'],
		exit: ['set']
	}
	type Context = {
		counter: number
	}
	const guards: GuardMap<Schema, Event, Guard, Context> = {
		canDo: ({ context: { counter } }) => Promise.resolve(counter === 1)
	}
	const actions: ActionMap<Schema, Event, Action, Context> = {
		set: () => Promise.resolve({ counter: 1 }),
		inc: ({ context: { counter } }) =>
			Promise.resolve({ counter: counter + 1 }),
		delete: () => Promise.resolve({ counter: 0 })
	}
	const config: ServiceConfig<Schema, Event, Action, Guard, Context> = {
		machine,
		guards,
		actions
	}

	it('starts in nested state', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 's.s1'
		})

		expect(service).toEqual({
			...service,
			context: { counter: 1 },
			currentState: 's.s1'
		})
	})

	it('transitions to parent', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 's.s2'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			context: { counter: 1 },
			currentState: 'u',
			history: ['s.s2']
		})
	})

	it('transitions to inner state', async () => {
		const service = init({
			...config,
			context: { counter: 1 },
			currentState: 't.t2'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			context: { counter: 1 },
			currentState: 's.s1',
			history: ['t.t2']
		})
	})
})

describe('history state', () => {
	type SimpleEvents = 'do' | 'back'
	type Event = { type: SimpleEvents }

	type Schema = {
		s1: null
		s2: null
		s3: null
		s4: null
		s5: null
		s6: null
		s7: null
	}

	const machine: Machine<Schema, Event['type']> = {
		id: 'history',
		initial: 's1',
		states: {
			s1: { on: { do: '$history' } },
			s2: { on: { '': '$history' } },
			s3: { on: { '': '$history' } },
			s5: { on: { '': 's3' } },
			s4: { on: { do: 's2' } },
			s6: { on: { do: 's7' } },
			s7: { on: { '': 's4' } }
		}
	}
	const config: ServiceConfig<Schema, Event> = { machine }

	it('transitions to history', async () => {
		const service = init({
			...config,
			currentState: 's1',
			history: ['s4']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 's4',
			history: []
		})
	})

	it('transitions to nested history', async () => {
		const service = init({
			...config,
			currentState: 's1',
			history: ['s4', 's3', 's2']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 's4',
			history: []
		})
	})

	it('auto transitions to nested history', async () => {
		const service = init({
			...config,
			currentState: 's1',
			history: ['s4', 's5']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 's4',
			history: ['s5']
		})
	})

	it('handles previous history', async () => {
		const service = init({
			...config,
			currentState: 's1',
			history: ['s3', 's2', 's4']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 's4',
			history: ['s3', 's2']
		})
	})

	it('handles auto transitions history', async () => {
		const service = init({
			...config,
			currentState: 's6',
			history: []
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 's4',
			history: ['s6', 's7']
		})
	})

	it('handles ignore', async () => {
		const customMachine: Machine<Schema, Event['type']> = {
			...machine,
			states: {
				...machine.states,
				s1: { on: { do: { target: '$history', ignore: ['s4'] } } }
			}
		}
		const service = init({
			...config,
			machine: customMachine,
			currentState: 's1',
			history: ['s3', 's6', 's4']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 's6',
			history: ['s3']
		})
	})

	it("doesn't transition if no history", async () => {
		const service = init({
			...config,
			currentState: 's1',
			history: []
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...config,
			currentState: 's1',
			history: []
		})
	})
})
