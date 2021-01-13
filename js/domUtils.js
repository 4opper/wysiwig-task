export function getNodesBetween(rootNode, node1, node2) {
  let resultNodes = []
  let isBetweenNodes = false

  if (rootNode.isSameNode(node1) && node1.isSameNode(node2)) {
    return [rootNode]
  }

  for (let i = 0; i < rootNode.childNodes.length; i++) {
    const currentChild = rootNode.childNodes[i]

    if (
      isDescendant(currentChild, node1) ||
      isDescendant(currentChild, node2)
    ) {
      isBetweenNodes = resultNodes.length === 0
      resultNodes.push(currentChild)
    } else if (isBetweenNodes) {
      resultNodes.push(currentChild)
    }
  }

  return resultNodes
}

export function getParentNodeWithTag({ node, tagName, rootNode }) {
  const nodeParents = getNodeParentsUntil(node, rootNode)

  return nodeParents.find((parentNode) => parentNode.tagName === tagName)
}

export function getTextNodes(node) {
  const recursor = (node) => {
    let textNodes = []
    if (node.nodeType !== 3) {
      if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
          textNodes = [...textNodes, ...recursor(node.childNodes[i])]
        }
      }
    } else {
      textNodes.push(node)
    }

    return textNodes
  }

  return recursor(node)
}

function isDescendant(parent, child) {
  return parent.contains(child)
}

export function createTextNode(text) {
  return document.createTextNode(text)
}

function getNodeParentsUntil(node, rootNode) {
  const parentNodes = []
  let currentNode = node

  while (currentNode !== rootNode) {
    const parent = currentNode.parentNode
    parentNodes.push(parent)
    currentNode = parent
  }

  return parentNodes
}
