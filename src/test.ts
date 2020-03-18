import {
	Machine,
	EventObject,
	StateSchema,
	State,
	GuardMap,
	ActionMap,
	Service,
	ServiceConfig
} from './types'

type Guard = 'do' | 'dont'
type Action = 'log' | 'bog'

type Schema = {
	s1: null
	s2: null
	s3: { s4: null }
}

type Event = { type: 'ok' }

// const machine: Machine<Schema, 'ok', Guard, Action> = {
const machine: Machine<Schema, Event['type']> = {
	id: 'test',
	initial: 's1',
	states: {
		s1: { on: {} },
		s2: {},
		s3: { initial: 's4', states: { s4: {} } }
	}
}

const guards: GuardMap<{}, Event, State<Schema>, Guard> = {
	do: () => Promise.resolve(true),
	dont: () => Promise.resolve(false)
}

const actions: ActionMap<{}, Event, State<Schema>, Action> = {
	log: () => Promise.resolve({}),
	bog: () => Promise.resolve({})
}

export function createService<
	TContext extends {},
	TEventObject extends EventObject,
	TStateSchema extends StateSchema,
	TGuard extends string,
	TAction extends string
>(
	options: ServiceConfig<
		TContext,
		TEventObject,
		TStateSchema,
		TGuard,
		TAction
	>
): Service<TContext, TEventObject, TStateSchema, TGuard, TAction> {
	return {
		machine: options.machine,
		context: options.context,
		guards: options.guards,
		actions: options.actions,
		currentState: options.initialState ?? machine.initial
	}
}

const s = createService<{}, Event, Schema, Guard, Action>({
	machine: machine,
	context: {},
	initialState: 's1',
	guards,
	actions
})

console.log(s)
