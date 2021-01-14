export function selectRange({
  startContainer,
  startOffset = 0,
  endContainer,
  endOffset = 1,
}) {
  const range = createRange()
  const selection = getSelection()

  selection.removeAllRanges()
  range.setStart(startContainer, startOffset)
  range.setEnd(endContainer, endOffset)
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
