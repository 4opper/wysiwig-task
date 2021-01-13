export function selectRange({
  startNode,
  startOffset = 0,
  endNode,
  endOffset = 1,
}) {
  const range = createRange()
  const selection = getSelection()

  selection.removeAllRanges()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  selection.addRange(range)
}

export function getSelection() {
  return document.getSelection()
}

export function getRange() {
  const selection = getSelection()

  return selection.getRangeAt(0)
}

function createRange() {
  return document.createRange()
}
