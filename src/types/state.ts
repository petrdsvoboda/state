export interface Schema {
	[key: string]: null | Schema
}

// type Merge<T, U> = T extends string ? U extends string ? `${T}.${U}` : never : never
// export type StateNodeName<T extends Schema> = {
// 	[K in keyof T]: T[K] extends null ? K : K | Merge<K, StateNodeName<NonNullable<T[K]>>>
// }[keyof T]
// export type StateName<T extends Schema> = {
// 	[K in keyof T]: T[K] extends null ? K : Merge<K, StateName<NonNullable<T[K]>>>
// }[keyof T]
// export type StatePath<T extends Schema> = {
// 	[K in keyof T]: T[K] extends null ? [K] : [K, ...StatePath<NonNullable<T[K]>>]
// }[keyof T]

export type StateNodeName<T extends Schema> = string
export type StateName<T extends Schema> = string
export type StatePath<T extends Schema> = string[]

export type HistoryState = '$history'
