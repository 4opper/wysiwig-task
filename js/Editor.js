// TODO handle case by case:
// 1) zero elements selected: a) before word, b) after word, c) in the middle of the word
// 2) single element:
//   2.1) without selection
//   2.2) with full selection
//   2.3) with partial selection
// so on...
// TODO implement turning style off
// TODO make it work for already styled text (nested text)
export class Editor {
  static getSelection = () => window.getSelection()

  static selectRange = ({
    startNode,
    startOffset = 0,
    endNode,
    endOffset = 1,
  }) => {
    const range = document.createRange()
    const selection = getSelection()

    selection.removeAllRanges()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    selection.addRange(range)
  }

  static getSelectedNodes = () => {
    const range = Editor.getSelection().getRangeAt(0)
    const selectedDOMNodes = []
    let shouldIterate = true
    let currentNodeElement = range.startContainer

    while (shouldIterate) {

      // if (range.startOffset === 0 && range.endOffset === 0) {
      selectedDOMNodes.push(currentNodeElement.firstChild || currentNodeElement)
      shouldIterate = (currentNodeElement.firstChild || currentNodeElement) !== range.endContainer
      currentNodeElement = currentNodeElement.nextSibling
      // }
    }

    return { selectedDOMNodes, range }
  }
  
  constructor (caret) {
    this.caret = caret
  }

  isItalicActive = false

  setIsItalicIconActive = (isActive) => {
    if (this.isItalicActive !== isActive) {
      this.isItalicActive = isActive

      const icon = document.querySelector('.italic')

      if (isActive) {
        icon.style.opacity = '100%'
      } else {
        icon.style.opacity = '60%'
      }
    }
  }

  clearActiveButtons = () => {
    this.setIsItalicIconActive(false)
  }

  handleItalicClick = () => {
    const { selectedDOMNodes, range } = Editor.getSelectedNodes()
    const { startOffset, endOffset, collapsed } = range

    const updatedSelectedNodes = []
    selectedDOMNodes.forEach(node => {
      if (node.nodeValue) {
        // Single DOM node
        if (selectedDOMNodes.length === 1) {
          let nodeToSelect = node
          let startOffsetToUse = startOffset
          let endOffsetToUse = endOffset

          // Nothing is selected
          if (collapsed) {
            const charBeforeCaret = node.nodeValue[startOffset - 1]
            const charAfterCaret = node.nodeValue[startOffset]


            // Inside word
            if (charBeforeCaret && charBeforeCaret !== ' ' && charAfterCaret &&  charAfterCaret !== ' ') {
              const { range: wordRange } = this.caret.selectWordAtCaret()
              const word = wordRange.toString()
              const start = node.nodeValue.slice(0, wordRange.startOffset)
              const end = node.nodeValue.slice(wordRange.endOffset, node.length)
              const italicNode = document.createElement('i')

              italicNode.append(word)

              node.replaceWith(start, italicNode, end)

              updatedSelectedNodes.push(italicNode)

              nodeToSelect = italicNode.firstChild
              startOffsetToUse = startOffset - start.length
              endOffsetToUse = startOffset - start.length
            }

            if (updatedSelectedNodes.length) {
              this.setIsItalicIconActive(!this.isItalicActive)

              Editor.selectRange({
                startNode: nodeToSelect,
                startOffset: startOffsetToUse,
                endNode: nodeToSelect,
                endOffset: endOffsetToUse,
              })

            }

            return

            // Inner part of word is selected
          } else if (startOffset !== 0 && endOffset !== 0) {
            const italicNode = document.createElement('i')

            range.surroundContents(italicNode)
            updatedSelectedNodes.push(italicNode)
          }
        } else {
          const italicNode = document.createElement('i')
          italicNode.innerHTML = node.nodeValue
          node.replaceWith(italicNode)
          updatedSelectedNodes.push(italicNode)
        }
      } else {
        updatedSelectedNodes.push(node)
      }
    })

    if (updatedSelectedNodes.length && !collapsed) {
      this.setIsItalicIconActive(!this.isItalicActive)

      Editor.selectRange({
        startNode: updatedSelectedNodes[0],
        endNode: updatedSelectedNodes[updatedSelectedNodes.length - 1],
      })
    }
  }
}
