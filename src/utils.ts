export const isArray = <T>(arg: T | T[]): arg is T[] => Array.isArray(arg)

export const isNonNullable = <T>(arg: T): arg is NonNullable<T> =>
	arg !== null && arg !== undefined
