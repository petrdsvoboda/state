class StateNode<
	TContext = any,
	TStateSchema extends StateSchema = any,
	TEvent extends EventObject = EventObject
> {
	public key: string
	public id: string
	public type: 'atomic' | 'compound' | 'parallel' | 'final' | 'history'

	public path: string[]
	public initial?: keyof TStateSchema['states']
	/**
	 * The child state nodes.
	 */
	public states: StateNodesConfig<TContext, TStateSchema, TEvent>
}

export class State<
	TContext,
	TEvent extends EventObject = EventObject,
	TStateSchema extends StateSchema<TContext> = any
> {
	public value: StateValue
	public context: TContext
	public actions: Array<ActionObject<TContext, TEvent>> = []
	public meta: any = {}
	public events: TEvent[] = []
	public event: TEvent
	public configuration: Array<StateNode<TContext, any, TEvent>>
	public transitions: Array<TransitionDefinition<TContext, TEvent>>
}

export type EventType = string
export type ActionType = string
export type MetaObject = Record<string, any>

export interface EventObject {
	type: string
}

export interface AnyEventObject extends EventObject {
	[key: string]: any
}

export interface ActionObject<TContext, TEvent extends EventObject> {
	type: string
	exec?: ActionFunction<TContext, TEvent>
	[other: string]: any
}

export type DefaultContext = Record<string, any> | undefined

export type EventData = Record<string, any> & { type?: never }

export type Event<TEvent extends EventObject> = TEvent['type'] | TEvent

export interface ActionMeta<TContext, TEvent extends EventObject>
	extends StateMeta<TContext, TEvent> {
	action: ActionObject<TContext, TEvent>
}

export type ActionFunction<TContext, TEvent extends EventObject> = (
	context: TContext,
	event: TEvent,
	meta: ActionMeta<TContext, TEvent>
) => any | void

// export type InternalAction<TContext> = SendAction | AssignAction<TContext>;
export type Action<TContext, TEvent extends EventObject> =
	| ActionType
	| ActionObject<TContext, TEvent>
	| ActionFunction<TContext, TEvent>

export type Actions<TContext, TEvent extends EventObject> = SingleOrArray<
	Action<TContext, TEvent>
>

export type StateKey = string | State<any>

export interface StateValueMap {
	[key: string]: StateValue
}

/**
 * The string or object representing the state value relative to the parent state node.
 *
 * - For a child atomic state node, this is a string, e.g., `"pending"`.
 * - For complex state nodes, this is an object, e.g., `{ success: "someChildState" }`.
 */
export type StateValue = string | StateValueMap

export type ConditionPredicate<TContext, TEvent extends EventObject> = (
	context: TContext,
	event: TEvent,
	meta: GuardMeta<TContext, TEvent>
) => boolean

export type DefaultGuardType = 'xstate.guard'

export interface GuardPredicate<TContext, TEvent extends EventObject> {
	type: DefaultGuardType
	name: string | undefined
	predicate: ConditionPredicate<TContext, TEvent>
}

export type Guard<TContext, TEvent extends EventObject> =
	| GuardPredicate<TContext, TEvent>
	| (Record<string, any> & {
			type: string
	  })

export interface GuardMeta<TContext, TEvent extends EventObject>
	extends StateMeta<TContext, TEvent> {
	cond: Guard<TContext, TEvent>
}

export type Condition<TContext, TEvent extends EventObject> =
	| string
	| ConditionPredicate<TContext, TEvent>
	| Guard<TContext, TEvent>

export type TransitionTarget<
	TContext,
	TEvent extends EventObject
> = SingleOrArray<string | StateNode<TContext, any, TEvent>>

export type TransitionTargets<TContext> = Array<
	string | StateNode<TContext, any>
>

export interface TransitionConfig<TContext, TEvent extends EventObject> {
	cond?: Condition<TContext, TEvent>
	actions?: Actions<TContext, TEvent>
	target?: TransitionTarget<TContext, TEvent>
}

export interface TargetTransitionConfig<TContext, TEvent extends EventObject>
	extends TransitionConfig<TContext, TEvent> {
	target: TransitionTarget<TContext, TEvent> // TODO: just make this non-optional
}

export type ConditionalTransitionConfig<
	TContext,
	TEvent extends EventObject = EventObject
> = Array<TransitionConfig<TContext, TEvent>>

export type Transition<TContext, TEvent extends EventObject = EventObject> =
	| string
	| TransitionConfig<TContext, TEvent>
	| ConditionalTransitionConfig<TContext, TEvent>

export type StateTypes =
	| 'atomic'
	| 'compound'
	| 'parallel'
	| 'final'
	| 'history'
	| string // TODO: remove once TS fixes this type-widening issue

export type SingleOrArray<T> = T[] | T

export type StateNodesConfig<
	TContext,
	TStateSchema extends StateSchema,
	TEvent extends EventObject
> = {
	[K in keyof TStateSchema['states']]: StateNode<
		TContext,
		TStateSchema['states'][K],
		TEvent
	>
}

export type StatesConfig<
	TContext,
	TStateSchema extends StateSchema,
	TEvent extends EventObject
> = {
	[K in keyof TStateSchema['states']]: StateNodeConfig<
		TContext,
		TStateSchema['states'][K],
		TEvent
	>
}

export type StatesDefinition<
	TContext,
	TStateSchema extends StateSchema,
	TEvent extends EventObject
> = {
	[K in keyof TStateSchema['states']]: StateNodeDefinition<
		TContext,
		TStateSchema['states'][K],
		TEvent
	>
}

export type TransitionConfigTargetShortcut<
	TContext,
	TEvent extends EventObject
> = string | undefined | StateNode<TContext, any, TEvent>

type TransitionsConfigMap<TContext, TEvent extends EventObject> = {
	[K in TEvent['type'] | NullEvent['type'] | '*']?: SingleOrArray<
		| TransitionConfigTargetShortcut<TContext, TEvent>
		| (TransitionConfig<
				TContext,
				K extends TEvent['type']
					? Extract<TEvent, { type: K }>
					: EventObject
		  > & {
				event?: undefined
		  })
	>
}

type TransitionsConfigArray<TContext, TEvent extends EventObject> = Array<
	{
		[K in TEvent['type'] | NullEvent['type'] | '*']: TransitionConfig<
			TContext,
			K extends TEvent['type']
				? Extract<TEvent, { type: K }>
				: EventObject
		> & {
			event: K
		}
	}[TEvent['type'] | NullEvent['type'] | '*']
>

export type TransitionsConfig<TContext, TEvent extends EventObject> =
	| TransitionsConfigMap<TContext, TEvent>
	| TransitionsConfigArray<TContext, TEvent>

export interface StateNodeConfig<
	TContext,
	TStateSchema extends StateSchema,
	TEvent extends EventObject
> {
	initial?: keyof TStateSchema['states'] | undefined
	/**
	 * The type of this state node:
	 *
	 *  - `'atomic'` - no child state nodes
	 *  - `'compound'` - nested child state nodes (XOR)
	 *  - `'parallel'` - orthogonal nested child state nodes (AND)
	 *  - `'history'` - history state node
	 *  - `'final'` - final state node
	 */
	type?: 'atomic' | 'compound' | 'parallel' | 'final' | 'history'
	/**
	 * The initial context (extended state) of the machine.
	 *
	 * Can be an object or a function that returns an object.
	 */
	context?: TContext | (() => TContext)
	states?: StatesConfig<TContext, TStateSchema, TEvent> | undefined
	on?: TransitionsConfig<TContext, TEvent>
	entry?: Actions<TContext, TEvent>
	exit?: Actions<TContext, TEvent>
	id?: string | undefined
}

export interface StateNodeDefinition<
	TContext,
	TStateSchema extends StateSchema,
	TEvent extends EventObject
> {
	id: string
	version: string | undefined
	key: string
	context: TContext
	type: 'atomic' | 'compound' | 'parallel' | 'final' | 'history'
	initial: StateNodeConfig<TContext, TStateSchema, TEvent>['initial']
	history: boolean | 'shallow' | 'deep' | undefined
	states: StatesDefinition<TContext, TStateSchema, TEvent>
	on: TransitionDefinitionMap<TContext, TEvent>
	transitions: Array<TransitionDefinition<TContext, TEvent>>
	entry: Array<ActionObject<TContext, TEvent>>
	exit: Array<ActionObject<TContext, TEvent>>
	meta: any
	order: number
}

export type AnyStateNodeDefinition = StateNodeDefinition<any, any, any>
export interface AtomicStateNodeConfig<TContext, TEvent extends EventObject>
	extends StateNodeConfig<TContext, StateSchema, TEvent> {
	initial?: undefined
	parallel?: false | undefined
	states?: undefined
	onDone?: undefined
}

export type ActionFunctionMap<TContext, TEvent extends EventObject> = Record<
	string,
	ActionObject<TContext, TEvent> | ActionFunction<TContext, TEvent>
>

export interface MachineConfig<
	TContext,
	TStateSchema extends StateSchema,
	TEvent extends EventObject
> extends StateNodeConfig<TContext, TStateSchema, TEvent> {
	context?: TContext | (() => TContext)
	version?: string
}

export interface StateMachine<
	TContext,
	TStateSchema extends StateSchema,
	TEvent extends EventObject
> extends StateNode<TContext, TStateSchema, TEvent> {
	id: string
	states: StateNode<TContext, TStateSchema, TEvent>['states']
}

export enum ActionTypes {
	Start = 'xstate.start',
	Stop = 'xstate.stop',
	Raise = 'xstate.raise',
	Send = 'xstate.send',
	Cancel = 'xstate.cancel',
	NullEvent = '',
	Assign = 'xstate.assign',
	After = 'xstate.after',
	DoneState = 'done.state',
	DoneInvoke = 'done.invoke',
	Log = 'xstate.log',
	Init = 'xstate.init',
	Invoke = 'xstate.invoke',
	ErrorExecution = 'error.execution',
	ErrorCommunication = 'error.communication',
	ErrorPlatform = 'error.platform',
	ErrorCustom = 'xstate.error',
	Update = 'xstate.update',
	Pure = 'xstate.pure'
}

export interface NullEvent {
	type: ActionTypes.NullEvent
}

export type Expr<TContext, TEvent extends EventObject, T> = (
	context: TContext,
	event: TEvent
) => T

export type ExprWithMeta<TContext, TEvent extends EventObject, T> = (
	context: TContext,
	event: TEvent
) => T

export interface TransitionDefinition<TContext, TEvent extends EventObject>
	extends TransitionConfig<TContext, TEvent> {
	target: Array<StateNode<TContext, any, TEvent>> | undefined
	source: StateNode<TContext, any, TEvent>
	actions: Array<ActionObject<TContext, TEvent>>
	cond?: Guard<TContext, TEvent>
	eventType: TEvent['type'] | NullEvent['type'] | '*'
}

export type TransitionDefinitionMap<TContext, TEvent extends EventObject> = {
	[K in TEvent['type'] | NullEvent['type'] | '*']: Array<
		TransitionDefinition<
			TContext,
			K extends TEvent['type']
				? Extract<TEvent, { type: K }>
				: EventObject
		>
	>
}

export interface StateMeta<TContext, TEvent extends EventObject> {
	state: State<TContext, TEvent>
}

export interface StateConfig<TContext, TEvent extends EventObject> {
	value: StateValue
	context: TContext
	history?: State<TContext, TEvent>
	actions?: Array<ActionObject<TContext, TEvent>>
	meta?: any
	events?: TEvent[]
	configuration: Array<StateNode<TContext, any, TEvent>>
	transitions: Array<TransitionDefinition<TContext, TEvent>>
	done?: boolean
}

export interface StateSchema<TC = any> {
	context?: Partial<TC>
	states?: {
		[key: string]: StateSchema<TC>
	}
}
