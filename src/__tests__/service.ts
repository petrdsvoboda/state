import { createService, sendEvent, EventError } from '../service'
import { Machine, GuardMap, ActionMap, EventWithPayload } from '../types'

describe('createService', () => {
	type State = 'new' | 'done'
	type SimpleEvents = 'complete'
	type CustomEvent = EventWithPayload<'custom', { counter: number }>
	type CustomEvents = CustomEvent
	type Event = { type: SimpleEvents } | CustomEvents

	const machine: Machine<State, Event['type']> = {
		initial: 'new',
		states: {
			new: {},
			done: {}
		}
	}
	const context: {} = {}

	test('it creates simple service', () => {
		const service = createService({ machine, context })
		expect(service).toEqual({
			machine,
			context,
			currentState: 'new'
		} as typeof service)
	})

	test('it creates service at state', () => {
		const service = createService({
			machine,
			context,
			initialState: 'done'
		})
		expect(service).toEqual({
			machine,
			context,
			currentState: 'done',
			guards: undefined,
			actions: undefined
		} as typeof service)
	})

	test('it creates service with guards', () => {
		type Guard = 'applyGuard'
		const guards: GuardMap<{}, State, Guard> = {
			applyGuard: () => true
		}
		const guardMachine: Machine<State, Event['type'], Guard> = {
			initial: 'new',
			states: {
				new: {},
				done: {}
			}
		}
		const service = createService({
			machine: guardMachine,
			context,
			guards
		})
		expect(service).toEqual({
			machine,
			context,
			guards,
			currentState: 'new',
			actions: undefined
		} as typeof service)
	})

	test('it creates service with actions', () => {
		type Action = 'applyAction'
		const actions: ActionMap<{}, State, Event, Action> = {
			applyAction: ({}) => Promise.resolve({})
		}
		const actionMachine: Machine<
			State,
			Event['type'],
			undefined,
			Action
		> = {
			initial: 'new',
			states: {
				new: {},
				done: {}
			}
		}
		const service = createService({
			machine: actionMachine,
			context,
			actions
		})
		expect(service).toEqual({
			machine,
			context,
			actions,
			currentState: 'new',
			guards: undefined
		} as typeof service)
	})
})

describe('sendEvent', () => {
	type State =
		| 'new'
		| 'state1'
		| 'state2'
		| 'state3'
		| 'state4'
		| 'state5'
		| 'state6'
		| 'state7'
		| 'done'

	type SimpleEvents = 'do' | 'back' | 'complete' | 'restart'
	type CustomEvent = EventWithPayload<'addPayload', { counter: number }>
	type CustomEvents = CustomEvent
	type Event = { type: SimpleEvents } | CustomEvents
	type Guard = 'canDo'
	type Action = 'set' | 'inc' | 'delete' | 'fail'
	const machine: Machine<State, Event['type'], Guard, Action> = {
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
					do: { target: 'state2' },
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
			state6: { on: { do: { target: 'done' } } },
			state7: {
				on: { do: { target: 'state6' } },
				exit: ['inc'],
				entry: ['inc']
			},
			done: {}
		},
		on: { restart: { target: 'new' } }
	}
	type Context = {
		counter?: number
	}
	const context: Context = {}
	const guards: GuardMap<Context, State, Guard> = {
		canDo: ({ counter }) => counter === 1
	}
	const actions: ActionMap<Context, State, Event, Action> = {
		set: (_x, _y, event) =>
			Promise.resolve({
				counter: event.type === 'addPayload' ? event.payload.counter : 1
			}),
		inc: ({ counter }) =>
			Promise.resolve(
				counter ? { counter: counter + 1 } : { counter: 1 }
			),
		delete: () => Promise.resolve({}),
		fail: () => Promise.reject('fail')
	}
	const baseService = createService({
		machine,
		context,
		guards,
		actions
	})

	test('it completes simple transition', async () => {
		expect(await sendEvent(baseService, 'complete')).toEqual({
			...baseService,
			currentState: 'done'
		} as typeof baseService)
	})

	test('it stays at state without transition', async () => {
		const service = createService({
			...baseService,
			machine: {
				...baseService.machine,
				on: undefined
			}
		})
		expect(await sendEvent(service, 'back')).toEqual(service)
	})

	test('it handles global transition', async () => {
		const service = createService({
			...baseService,
			initialState: 'state3'
		})
		expect(await sendEvent(service, 'restart')).toEqual({
			...service,
			currentState: 'new'
		} as typeof service)
	})

	test('it handles auto transition', async () => {
		const service = createService({
			...baseService,
			initialState: 'state4'
		})
		expect(await sendEvent(service, '')).toEqual({
			...service,
			currentState: 'done',
			context: { counter: 2 }
		} as typeof service)
	})

	test('it handles passed guards', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 }
		})
		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'state1'
		} as typeof service)
	})

	test('it handles failed guards', async () => {
		expect(await sendEvent(baseService, 'do')).toEqual({
			...baseService,
			currentState: 'state2'
		} as typeof baseService)
	})

	test('it handles all failed guards', async () => {
		const service = createService({
			...baseService,
			context: { counter: 2 },
			initialState: 'state1'
		})
		expect(await sendEvent(service, 'back')).toEqual({
			...service,
			currentState: 'state1'
		} as typeof baseService)
	})

	test('it handles actions', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state2'
		})
		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'state3',
			context: { counter: 2 }
		} as typeof service)
	})

	test('it handles actions with data', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state2'
		})
		expect(
			await sendEvent(service, {
				type: 'addPayload',
				payload: { counter: 5 }
			})
		).toEqual({
			...service,
			currentState: 'state3',
			context: { counter: 5 }
		} as typeof service)
	})

	test('it handles failed action', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state4'
		})

		await expect(sendEvent(service, 'do')).rejects.toThrow(
			new EventError('do', 'fail', 'fail')
		)
	})

	test('it handles entry action', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state6'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'state7',
			context: { counter: 2 }
		} as typeof service)
	})

	test('it handles exit action', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state7'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'state6',
			context: { counter: 2 }
		} as typeof service)
	})
})
