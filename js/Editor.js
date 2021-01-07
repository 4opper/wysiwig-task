export class Editor {
  static getSelection = () => window.getSelection()

  static selectRange = (startNode, endNode) => {
    const range = document.createRange()
    const selection = getSelection()

    selection.removeAllRanges()
    range.setStart(startNode, 0)
    range.setEnd(endNode, 1)

    selection.addRange(range)
  }

  isItalicActive = false

  isHeadingActive = false

  isSubheadingActive = false

  isBoldActive = false

  clearActiveButtons = () => {
    this.setIsItalicIconActive(false)
  }

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

  handleHeadingClick = () => {
    console.log('handleHeadingCLick', Editor.getSelection())
  }

  handleSubheadingClick = () => {
    console.log('handleSubheadingClick', Editor.getSelection())
  }

  handleBoldClick = () => {
    console.log('handleBoldClick', Editor.getSelection())
  }

  getSelectedNodes = () => {
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

  handleItalicClick = () => {
    const { selectedDOMNodes, range } = this.getSelectedNodes()

    // TODO handle case by case:
    // 1) zero elements selected: a) before word, b) after word, c) in the middle of the word
    // 2) single element:
    //   2.1) without selection
    //   2.2) with full selection
    //   2.3) with partial selection
    // so on...
    // TODO Should update only part of string - seems can use insertNode/surroundContents
    // TODO apply for the full word if nothing is selected
    // TODO implement turning style off
    // TODO make it work for already styled text (nested text)
    const updatedSelectedNodes = []
    selectedDOMNodes.forEach(node => {
      if (node.nodeValue) {
        if (selectedDOMNodes.length === 1) {
          // When nothing is selected
          if (range.startOffset === range.endOffset) {
            if (range.startOffset === 0) {
              console.log("beginning of the word")
            } else if (range.startOffset === node.length) {
              console.log("end of the word")
            } else {
              console.log("inside of the word")
            }
          } else if (range.startOffset !== 0 && range.endOffset !== 0) {
            // const start = node.nodeValue.slice(0, startOffset)
            // const selected = node.nodeValue.slice(startOffset, endOffset)
            // const end = node.nodeValue.slice(endOffset, node.length)
            const italicNode = document.createElement('i')

            // range.insertNode(italicNode)
            range.surroundContents(italicNode)

            // debugger
            updatedSelectedNodes.push(italicNode)
          }

          // debugger
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

    if (updatedSelectedNodes.length) {
      this.setIsItalicIconActive(!this.isItalicActive)

      Editor.selectRange(updatedSelectedNodes[0], updatedSelectedNodes[updatedSelectedNodes.length - 1])
    }
  }
}
