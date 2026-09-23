import { InstancedMesh, TransformNode } from '@babylonjs/core'

/**
 * Recria uma hierarquia estatica usando instancias para toda folha que possui geometria.
 * O Babylon preserva os pivôs/nos intermediarios do GLB e compartilha geometria e material.
 */
export function instantiateStaticHierarchy(
  source: TransformNode,
  name: string,
  onInstanceCreated?: (instance: InstancedMesh) => void,
): TransformNode | null {
  const hierarchy = source.instantiateHierarchy(
    null,
    { doNotInstantiate: false },
    (sourceNode, createdNode) => {
      createdNode.name = sourceNode === source ? name : `${name}/${sourceNode.name}`
      if (createdNode instanceof InstancedMesh) onInstanceCreated?.(createdNode)
    },
  )

  if (!hierarchy) return null
  hierarchy.name = name
  hierarchy.setEnabled(true)
  return hierarchy
}

// Call only after final placement; freezing a parent alone does not freeze its children.
export function freezeStaticHierarchy(root: TransformNode): number {
  root.freezeWorldMatrix()
  const descendants = root.getChildTransformNodes(false)
  for (const node of descendants) node.freezeWorldMatrix()
  return descendants.length + 1
}
