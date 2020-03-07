import { BaseEvent, EventWithPayload } from './types'

export function createEvent<T extends string>(type: T): BaseEvent<T>
export function createEvent<T extends string, P>(
	type: T,
	payload: P
): EventWithPayload<T, P>
export function createEvent<T extends string, P>(
	type: T,
	payload?: P
): BaseEvent<T> | EventWithPayload<T, P> {
	return payload === undefined ? { type } : { type, payload }
}
