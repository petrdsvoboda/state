import { isArray, isNonNullable } from '../utils'

describe('isArray', () => {
	it('returns true if array', () => {
		expect(isArray([1, 2])).toEqual(true)
	})

	it('returns false if not array', () => {
		expect(isArray(1)).toEqual(false)
	})
})

describe('isNonNullable', () => {
	it('returns true if NonNullable', () => {
		expect(isNonNullable(1)).toEqual(true)
	})

	it('returns false if null', () => {
		expect(isNonNullable(null)).toEqual(false)
	})

	it('returns false if undefined', () => {
		expect(isNonNullable(undefined)).toEqual(false)
	})
})
