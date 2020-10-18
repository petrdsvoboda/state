import {
	Schema,
	StateName,
	AnyStateNode,
	AnyHistoryTransitionConfig,
	AnySimpleTransitionConfig,
	StatePath
} from './types'

export const stateFromPath = <TSchema extends Schema>(
	path: StatePath<TSchema>
): StateName<TSchema> => {
	return (path as any).join('.') as StateName<TSchema>
}

export const stateToPath = <TSchema extends Schema>(
	state: StateName<TSchema>
): StatePath<TSchema> => {
	return (state as string).split('.') as any
}

export const getNode = (
	path: StatePath<any>,
	root: AnyStateNode
): AnyStateNode | undefined => {
	return (path as string[]).reduce<{ wasLeaf: boolean; node: AnyStateNode }>(
		(acc, curr) => {
			const { wasLeaf, node } = acc
			if (wasLeaf) return acc
			if (curr !== undefined && 'states' in node)
				return { wasLeaf, node: node.states[curr] }
			return { wasLeaf: true, node }
		},
		{ wasLeaf: false, node: root }
	).node
}

export const historyPath = (
	transition: AnyHistoryTransitionConfig,
	history: string[]
): { path: StatePath<any>; history: string[] } | undefined => {
	const newHistory = history
	const tempHistory = [...newHistory]
	let lastState = tempHistory.pop()

	while (lastState && transition.ignore?.includes(lastState)) {
		lastState = tempHistory.pop()
	}

	if (!lastState) return

	return {
		path: stateToPath<any>(lastState),
		history: tempHistory
	}
}

const initialPath = (
	path: StatePath<any>,
	root: AnyStateNode
): StatePath<any> => {
	const node = getNode(path, root)
	if (node && 'initial' in node) {
		const newPath = [...path, node.initial] as StatePath<any>
		return initialPath(newPath, root)
	}
	return path
}

export const transitionPath = (
	transition: AnySimpleTransitionConfig,
	path: StatePath<any>,
	root: AnyStateNode
): StatePath<any> => {
	let targetPath = path.slice(0, -1) as StatePath<any>
	const target = transition.target as StateName<any>

	while (true) {
		const node = getNode(targetPath, root)
		if (node && 'states' in node && node.states[target]) {
			targetPath = initialPath([...targetPath, target], root)
			break
		}

		if (targetPath.length === 0) break
		targetPath = targetPath.slice(0, -1) as StatePath<any>
	}

	return targetPath
}
