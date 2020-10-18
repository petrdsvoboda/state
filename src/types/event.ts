export type AutoEvent = ''

export type EventObject<T extends string> = {
	type: T
}

export type EventObjectWithPayload<T extends string, TPayload> = EventObject<
	T
> & {
	payload: TPayload
}

export type AnyEventObject =
	| EventObject<string>
	| EventObjectWithPayload<string, unknown>

export type EventType<TEvent extends AnyEventObject> = TEvent['type']

export type Event<TEvent extends AnyEventObject> =
	| AutoEvent
	| TEvent['type']
	| TEvent
