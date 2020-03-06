import { createService, sendEvent } from '../service'
import { Machine, GuardMap, ActionMap } from '../types'

describe('createService', () => {
	type State = 'new' | 'done'
	type Event = 'complete'
	const machine: Machine<State, Event> = {
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
		const guardMachine: Machine<State, Event, Guard> = {
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
		const actions: ActionMap<{}, State, Action> = {
			applyAction: () => ({})
		}
		const guardMachine: Machine<State, Event, undefined, Action> = {
			initial: 'new',
			states: {
				new: {},
				done: {}
			}
		}
		const service = createService({
			machine: guardMachine,
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
		| 'done'
	type Event = 'do' | 'back' | 'complete' | 'restart'
	type Guard = 'canDo'
	type Action = 'set' | 'inc' | 'delete'
	const machine: Machine<State, Event, Guard, Action> = {
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
			state2: { on: { do: { target: 'state3', actions: ['inc'] } } },
			state3: {},
			state4: { on: { '': { target: 'state5', actions: ['set'] } } },
			state5: { on: { '': { target: 'done', actions: ['inc'] } } },
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
	const actions: ActionMap<Context, State, Action> = {
		set: () => ({ counter: 1 }),
		inc: ({ counter }) =>
			counter ? { counter: counter + 1 } : { counter: 1 },
		delete: () => ({})
	}
	const baseService = createService({ machine, context, guards, actions })

	test('it completes simple transition', () => {
		expect(sendEvent(baseService, 'complete')).toEqual({
			...baseService,
			currentState: 'done'
		} as typeof baseService)
	})

	test('it stays at state without transition', () => {
		const service = createService({
			...baseService,
			machine: {
				...baseService.machine,
				on: undefined
			}
		})
		expect(sendEvent(service, 'back')).toEqual(service)
	})

	test('it handles global transition', () => {
		const service = createService({
			...baseService,
			initialState: 'state3'
		})
		expect(sendEvent(service, 'restart')).toEqual({
			...service,
			currentState: 'new'
		} as typeof service)
	})

	test('it handles auto transition', () => {
		const service = createService({
			...baseService,
			initialState: 'state4'
		})
		expect(sendEvent(service, '')).toEqual({
			...service,
			currentState: 'done',
			context: { counter: 2 }
		} as typeof service)
	})

	test('it handles passed guards', () => {
		const service = createService({
			...baseService,
			context: { counter: 1 }
		})
		expect(sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'state1'
		} as typeof service)
	})

	test('it handles failed guards', () => {
		expect(sendEvent(baseService, 'do')).toEqual({
			...baseService,
			currentState: 'state2'
		} as typeof baseService)
	})

	test('it handles all failed guards', () => {
		const service = createService({
			...baseService,
			context: { counter: 2 },
			initialState: 'state1'
		})
		expect(sendEvent(service, 'back')).toEqual({
			...service,
			currentState: 'state1'
		} as typeof baseService)
	})

	test('it handles actions', () => {
		const service = createService({
			...baseService,
			context: { counter: 1 },
			initialState: 'state2'
		})
		expect(sendEvent(service, 'do')).toEqual({
			...service,
			currentState: 'state3',
			context: { counter: 2 }
		} as typeof service)
	})
})
