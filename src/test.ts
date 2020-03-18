export interface StateSchema {
	[key: string]: StateSchema | {}
}

const schema = {
	foo: {},
	bar: {
		barz: {},
		ok: {}
	}
}

// type RecordKeys<
// 	T extends Record<string, {} | Record<string, any>>
// > = keyof T extends Record<string, any> ? RecordKeys<keyof T> : keyof T

// type keys = RecordKeys<typeof schema>
// https://github.com/Microsoft/TypeScript/issues/31192#issuecomment-488391189
type ObjKeyof<T> = T extends object ? keyof T : never
type KeyofKeyof<T> = ObjKeyof<T> | { [K in keyof T]: ObjKeyof<T[K]> }[keyof T]
type Lookup<T, K> = T extends any ? (K extends keyof T ? T[K] : never) : never
type SimpleFlatten<T> = T extends object
	? {
			[K in KeyofKeyof<T>]:
				| Exclude<K extends keyof T ? T[K] : never, object>
				| { [P in keyof T]: Lookup<T[P], K> }[keyof T]
	  }
	: T
type NestedFlatten<T> = SimpleFlatten<
	SimpleFlatten<SimpleFlatten<SimpleFlatten<SimpleFlatten<T>>>>
>
type State<TStateSchema extends StateSchema> = keyof NestedFlatten<TStateSchema>

type Keys = State<typeof schema>
