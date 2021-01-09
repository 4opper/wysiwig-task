// TODO handle when not first and last lines are selected, but multiple lines are selected
// TODO implement turning style off
// TODO make it work for already styled text (nested text)
export class Editor {
  static selectRange = ({
    startNode,
    startOffset = 0,
    endNode,
    endOffset = 1,
  }) => {
    const range = document.createRange()
    const selection = document.getSelection()

    selection.removeAllRanges()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    selection.addRange(range)
  }

  static getSelectedNodes = () => {
    const range = document.getSelection().getRangeAt(0)
    const selectedLines = []
    let shouldIterate = true
    let currentNodeElement = range.startContainer

    // Bug is here, try cases with multiple epmty rows selected together with some non empty ones
    while (shouldIterate) {
      selectedLines.push(currentNodeElement.firstChild || currentNodeElement)
      shouldIterate = (currentNodeElement.firstChild || currentNodeElement) !== range.endContainer
      currentNodeElement = currentNodeElement.nextSibling
    }

    return { selectedLines, range }
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
    const { selectedLines, range } = Editor.getSelectedNodes()
    const { startContainer, startOffset, endContainer, endOffset, collapsed } = range

    const updatedSelectedNodes = []
    selectedLines.forEach((line, index) => {
      if (line.nodeValue) {
        if (selectedLines.length === 1) /*Single line selected or has caret*/ {
          console.log("single line")
          let nodeToSelect = line
          let startOffsetToUse = startOffset
          let endOffsetToUse = endOffset

          if (collapsed) /*Nothing is selected*/ {
            console.log("nothing is selected")
            const charBeforeCaret = line.nodeValue[startOffset - 1]
            const charAfterCaret = line.nodeValue[startOffset]

            if (charBeforeCaret && charBeforeCaret !== ' ' && charAfterCaret &&  charAfterCaret !== ' ') /*Inside word*/ {
              const { range: wordRange } = this.caret.selectWordAtCaret()
              const word = wordRange.toString()
              const start = line.nodeValue.slice(0, wordRange.startOffset)
              const end = line.nodeValue.slice(wordRange.endOffset, line.length)
              const italicNode = document.createElement('i')

              italicNode.append(word)

              line.replaceWith(start, italicNode, end)

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
          } else /*Any part of line is selected*/  {
            console.log("inner part of word")
            const italicNode = document.createElement('i')

            range.surroundContents(italicNode)
            updatedSelectedNodes.push(italicNode)
          }
        } else /*Multiple line selected or has caret*/ {
          const isFirstLine = line === selectedLines[0]
          const isLastLine = line === selectedLines[selectedLines.length - 1]
          
          if ((isFirstLine && startOffset === 0) || (isLastLine && endOffset === endContainer.length) || (!isFirstLine && !isLastLine))  {
            console.log("one of multiple lines is fully selected")
            const italicNode = document.createElement('i')
            const clonedNode = line.cloneNode()

            italicNode.appendChild(clonedNode)
            line.replaceWith(italicNode)
            updatedSelectedNodes.push(italicNode)
          } else {
            if (isFirstLine) {
              console.log("first of multiple lines is not fully selected")
              const italicNode = document.createElement('i')
              const notSelectedPart = line.nodeValue.slice(0, startOffset)
              const selectedPart = line.nodeValue.slice(startOffset, line.length)

              italicNode.append(selectedPart)
              line.replaceWith(notSelectedPart, italicNode)
              updatedSelectedNodes.push(italicNode)
            }

            if (isLastLine) {
              console.log("last of multiple lines is not fully selected")
              const italicNode = document.createElement('i')
              const selectedPart = line.nodeValue.slice(0, endOffset)
              const notSelectedPart = line.nodeValue.slice(endOffset, line.length)

              italicNode.append(selectedPart)
              line.replaceWith(italicNode, notSelectedPart)
              updatedSelectedNodes.push(italicNode)
            }
          }

        }
      } else {
        updatedSelectedNodes.push(line)
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
