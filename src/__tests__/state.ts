import { stateFromPath, stateToPath } from '../state'

describe('stateToPath', () => {
	type Schema = {
		new: null
		s: { s1: { s2: null } }
		done: null
	}

	it('handles simple path', () => {
		expect(stateToPath<Schema>('new')).toEqual(['new'])
	})

	it('handles nested path', () => {
		expect(stateToPath<Schema>('s.s1.s2')).toEqual(['s', 's1', 's2'])
	})
})

describe('toStatePath', () => {
	type Schema = {
		new: null
		s: { s1: { s2: null } }
		done: null
	}

	it('handles simple path', () => {
		expect(
			stateFromPath<Schema>(['new'])
		).toEqual('new')
	})

	it('handles nested path', () => {
		expect(
			stateFromPath<Schema>(['s', 's1', 's2'])
		).toEqual('s.s1.s2')
	})
})
