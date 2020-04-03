import {
	createService,
	sendEvent,
	EventError,
	fromStatePath,
	toStatePath
} from '../service'
import { Machine, GuardMap, ActionMap, State } from '../types'

describe('fromStatePath', () => {
	type Schema = {
		new: null
		s: { s1: { s2: null } }
		done: null
	}

	it('creates from simple path', () => {
		expect(fromStatePath<Schema>('new')).toEqual('new')
	})

	it('creates from nested path', () => {
		expect(fromStatePath<Schema>('s.s1.s2')).toEqual({ s: { s1: 's2' } })
	})
})

describe('toStatePath', () => {
	type Schema = {
		new: null
		s: { s1: { s2: null } }
		done: null
	}

	it('creates simple path', () => {
		expect(toStatePath<Schema>('new')).toEqual('new')
	})

	it('creates nested path', () => {
		expect(
			toStatePath<Schema>({ s: { s1: 's2' } })
		).toEqual('s.s1.s2')
	})
})

describe('createService', () => {
	type SimpleEvents = 'complete'
	type CustomEvents = { type: 'custom' }
	type Event = { type: SimpleEvents } | CustomEvents

	type Schema = {
		new: null
		done: null
	}

	const machine: Machine<Schema, Event['type'], undefined, undefined> = {
		id: 'test',
		initial: 'new',
		states: {
			new: {},
			done: {}
		}
	}
	const context: {} = {}

	test('it creates simple service', () => {
		const service = createService<{}, Event, Schema, undefined, undefined>({
			machine,
			context,
			guards: undefined,
			actions: undefined
		})
		expect(service).toEqual({
			machine,
			context,
			currentState: 'new',
			guards: undefined,
			actions: undefined,
			history: []
		} as typeof service)
	})

	test('it creates service at state', () => {
		const service = createService<{}, Event, Schema, undefined, undefined>({
			machine,
			context,
			initialState: 'done',
			guards: undefined,
			actions: undefined
		})
		expect(service).toEqual({
			machine,
			context,
			currentState: 'done',
			guards: undefined,
			actions: undefined,
			history: []
		} as typeof service)
	})

	test('it creates service with guards', () => {
		type Guard = 'applyGuard'
		const guards: GuardMap<{}, Event, Schema, Guard> = {
			applyGuard: () => Promise.resolve(true)
		}
		const guardMachine: Machine<Schema, Event['type'], Guard, undefined> = {
			id: 'test',
			initial: 'new',
			states: {
				new: {},
				done: {}
			}
		}
		const service = createService<{}, Event, Schema, Guard, undefined>({
			machine: guardMachine,
			context,
			guards,
			actions: undefined
		})
		expect(service).toEqual({
			machine,
			context,
			guards,
			currentState: 'new',
			actions: undefined,
			history: []
		} as typeof service)
	})

	test('it creates service with actions', () => {
		type Action = 'applyAction'
		const actions: ActionMap<{}, Event, Schema, Action> = {
			applyAction: ({}) => Promise.resolve({})
		}
		const actionMachine: Machine<
			Schema,
			Event['type'],
			undefined,
			Action
		> = {
			id: 'test',
			initial: 'new',
			states: {
				new: {},
				done: {}
			}
		}
		const service = createService<{}, Event, Schema, undefined, Action>({
			machine: actionMachine,
			context,
			actions,
			guards: undefined
		})
		expect(service).toEqual({
			machine,
			context,
			actions,
			currentState: 'new',
			guards: undefined,
			history: []
		} as typeof service)
	})
})

describe('sendEvent', () => {
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
	const guards: GuardMap<Context, Event, Schema, Guard> = {
		canDo: ({ counter }) => Promise.resolve(counter === 1)
	}
	const actions: ActionMap<Context, Event, Schema, Action> = {
		set: (context, state, event) => {
			if (state === 'done' && event.type === 'back') {
				return Promise.resolve({ counter: 1 })
			} else if (state === 'done') {
				return Promise.resolve(context)
			} else {
				return Promise.resolve({
					counter:
						event.type === 'addPayload' ? event.payload.counter : 1
				})
			}
		},
		inc: ({ counter }) =>
			Promise.resolve(
				counter ? { counter: counter + 1 } : { counter: 1 }
			),
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

	test('it completes simple transition', async () => {
		expect(await sendEvent(baseService, 'complete')).toEqual({
			...baseService,
			currentState: 'done',
			history: ['new']
		} as typeof baseService)
	})

	test('it stays at state without transition', async () => {
		const service = createService<Context, Event, Schema, Guard, Action>({
			...baseService,
			machine: {
				...(baseService.machine as any),
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
			currentState: 'new',
			history: ['state3']
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
			context: { counter: 2 },
			history: ['state4', 'state5']
		} as typeof service)
	})

	test('it handles passed guards', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 }
		})
		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'state1',
			history: ['new']
		} as typeof service)
	})

	test('it handles failed guards', async () => {
		expect(await sendEvent(baseService, 'do')).toEqual({
			...baseService,
			currentState: 'state2',
			history: ['new']
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
			context: { counter: 2 },
			history: ['state2']
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
			context: { counter: 5 },
			history: ['state2']
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
			context: { counter: 2 },
			history: ['state6']
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
			context: { counter: 2 },
			history: ['state7']
		} as typeof service)
	})

	test('it handles global entry action', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state8'
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'done',
			context: { counter: 2 },
			history: ['state8']
		} as typeof service)
	})

	test('it handles global exit action', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state8'
		})

		expect(await sendEvent(service, 'back')).toEqual({
			...service,
			currentState: 'done',
			context: { counter: 2 },
			history: ['state8']
		} as typeof service)
	})

	test('it handles transition if no actions provided', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state8',
			actions: undefined as any
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'done',
			history: ['state8']
		} as typeof service)
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
	const guards: GuardMap<Context, Event, Schema, Guard> = {
		canDo: ({ counter }) => Promise.resolve(counter === 1)
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

	it('starts in nested state', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: { s: 's1' }
		})

		expect(service).toEqual({
			...service,
			currentState: { s: 's1' }
		} as typeof service)
	})

	it('transitions to parent', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: { s: 's2' }
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'u',
			history: [{ s: 's2' }]
		} as typeof service)
	})

	it('transitions to inner state', async () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: { t: 't2' }
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: { s: 's1' },
			history: [{ t: 't2' }]
		} as typeof service)
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

	const machine: Machine<Schema, Event['type'], undefined, undefined> = {
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
	const baseService = createService({
		machine,
		context: {},
		guards: undefined,
		actions: undefined
	})

	it('transitions to history', async () => {
		const service = createService({
			...baseService,
			initialState: 's1',
			history: ['s4']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 's4',
			history: []
		} as typeof service)
	})

	it('transitions to nested history', async () => {
		const service = createService({
			...baseService,
			initialState: 's1',
			history: ['s4', 's3', 's2']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 's4',
			history: []
		} as typeof service)
	})

	it('auto transitions to nested history', async () => {
		const service = createService({
			...baseService,
			initialState: 's1',
			history: ['s4', 's5']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 's4',
			history: ['s5']
		} as typeof service)
	})

	it('handles previous history', async () => {
		const service = createService({
			...baseService,
			initialState: 's1',
			history: ['s3', 's2', 's4']
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 's4',
			history: ['s3', 's2']
		} as typeof service)
	})

	it('handles auto transitions history', async () => {
		const service = createService({
			...baseService,
			initialState: 's6',
			history: []
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 's4',
			history: ['s6', 's7']
		} as typeof service)
	})

	it("doesn't transition if no history", async () => {
		const service = createService({
			...baseService,
			initialState: 's1',
			history: []
		})

		expect(await sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 's1',
			history: []
		} as typeof service)
	})
})
