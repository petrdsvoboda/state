import { Action } from './types'

export class EventError extends Error {
	constructor(event: string, action: Action, message: string) {
		super(`Error in action ${action} while performing ${event}: ${message}`)
		this.name = 'EventError'
	}
}
