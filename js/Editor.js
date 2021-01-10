// TODO implement turning style off
// TODO check collapsed case
// TODO fix case when there are multiple empty lines in the end and other text are selected and
// after style update visual selection increases by 1 line
// TODO make headings work in office
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

  getSelectedNodes = () => {
    var selection = window.getSelection();
    var range = selection.getRangeAt(0)
    if (selection.isCollapsed) {
      return [];
    }


    var node1 = selection.anchorNode;
    var node2 = selection.focusNode;
    var selectionAncestor = range.commonAncestorContainer;
    if (selectionAncestor == null) {
      return [];
    }
    return { selectedNodes: this.getNodesBetween(selectionAncestor, node1, node2), range }
  }

  isDescendant = (parent, child) => {
    var node = child;
    while (node != null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  getNodesBetween = (rootNode, node1, node2) => {
    var resultNodes = [];
    var isBetweenNodes = false;
    for (var i = 0; i < rootNode.childNodes.length; i+= 1) {
      if (this.isDescendant(rootNode.childNodes[i], node1) || this.isDescendant(rootNode.childNodes[i], node2)) {
        if (resultNodes.length == 0) {
          isBetweenNodes = true;
        } else {
          isBetweenNodes = false;
        }
        resultNodes.push(rootNode.childNodes[i]);
      } else if (resultNodes.length == 0) {
      } else if (isBetweenNodes) {
        resultNodes.push(rootNode.childNodes[i]);
      } else {
        return resultNodes;
      }
    };
    if (resultNodes.length == 0) {
      return [rootNode];
    } else if (this.isDescendant(resultNodes[resultNodes.length - 1], node1) || this.isDescendant(resultNodes[resultNodes.length - 1], node2)) {
      return resultNodes;
    } else {
      // same child node for both should never happen
      return [resultNodes[0]];
    }
  }

  getTextNode = (node) => {
    function recursor(n) {
      var i, a = [];
      if (n.nodeType !== 3) {
        if (n.childNodes)
          for (i = 0; i < n.childNodes.length; ++i)
            a = a.concat(recursor(n.childNodes[i]));
      } else
        a.push(n);
      return a;
    }
    return recursor(node);
  }
  
  constructor (caret, editorNode) {
    this.caret = caret
    this.editorNode = editorNode
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

  getNodeParentsUntil = (node, untilNode) => {
    const parentNodes = []
    let currentNode = node

    while (currentNode !== untilNode) {
      const parent = currentNode.parentNode
      parentNodes.push(parent)
      currentNode = parent
    }

    return parentNodes
  }

  handleActionClick = (tagName) => {
    const { selectedNodes, range } = this.getSelectedNodes()
    const { startContainer, startOffset, endContainer, endOffset, collapsed } = range
    
    // console.log("selectedNodes: ", selectedNodes)

    const isSelectionAlreadyWrapper = selectedNodes.every((selectedNode) => {
      const textNodes = this.getTextNode(selectedNode).filter(textNode => Boolean(textNode.data))

      // console.log("textNodes: ", textNodes)

      const isAlreadyWrapped = textNodes.every(textNode => {
        const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
        // console.log("textNodeParents: ", textNodeParents)

        return textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)
      })

      // console.log("isAlreadyWrapped: ", isAlreadyWrapped)
      return isAlreadyWrapped
    })
    
    console.log("isSelectionAlreadyWrapper: ", isSelectionAlreadyWrapper)


    const updatedSelectedNodes = []
    selectedNodes.forEach((selectedNode, index) => {
      const textNodes = this.getTextNode(selectedNode).filter(textNode => Boolean(textNode.data))
      const isAlreadyWrapped = textNodes.every(textNode => {
        const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)

        return textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)
      })

      if (isAlreadyWrapped) {
        updatedSelectedNodes.push(selectedNode)
        return
      }

      textNodes.forEach(textNode => {
        if (textNode.data) {
          if (selectedNodes.length === 1) /*Single selectedNode selected or has caret*/ {
            console.log("single selectedNode")
            let nodeToSelect = textNode
            let startOffsetToUse = startOffset
            let endOffsetToUse = endOffset

            if (collapsed) /*Nothing is selected*/ {
              console.log("nothing is selected")
              const charBeforeCaret = textNode.data[startOffset - 1]
              const charAfterCaret = textNode.data[startOffset]

              if (charBeforeCaret && charBeforeCaret !== ' ' && charAfterCaret &&  charAfterCaret !== ' ') /*Inside word*/ {
                const { range: wordRange } = this.caret.selectWordAtCaret()
                const word = wordRange.toString()
                const start = textNode.data.slice(0, wordRange.startOffset)
                const end = textNode.data.slice(wordRange.endOffset, textNode.length)
                const italicNode = document.createElement(tagName)
                if (tagName === 'h1' || tagName === 'h2') {
                  italicNode.style.display = 'inline'
                }

                italicNode.append(word)

                textNode.replaceWith(start, italicNode, end)

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
            } else /*Any part of selectedNode is selected*/  {
              console.log("inner part of word or whole word")
              const selectedText = range.toString()
              const textBeforeSelected = textNode.data.slice(0, range.startOffset)
              const textAfterSelected = textNode.data.slice(range.endOffset, textNode.length)
              const italicNode = document.createElement(tagName)
              if (tagName === 'h1' || tagName === 'h2') {
                italicNode.style.display = 'inline'
              }

              italicNode.append(selectedText)
              textNode.replaceWith(textBeforeSelected, italicNode, textAfterSelected)
              updatedSelectedNodes.push(italicNode)
            }
          } else /*Multiple selectedNode selected or has caret*/ {
            const isFirstLine = selectedNode === selectedNodes[0]
            const isLastLine = selectedNode === selectedNodes[selectedNodes.length - 1]

            if ((isFirstLine && startOffset === 0) || (isLastLine && endOffset === endContainer.length) || (!isFirstLine && !isLastLine))  {
              // debugger
              console.log("one of multiple lines is fully selected")
              const italicNode = document.createElement(tagName)
              if (tagName === 'h1' || tagName === 'h2') {
                italicNode.style.display = 'inline'
              }
              const clonedNode = textNode.cloneNode()

              italicNode.appendChild(clonedNode)
              textNode.replaceWith(italicNode)
              updatedSelectedNodes.push(italicNode)
            } else {
              if (isFirstLine) {
                console.log("first of multiple lines is not fully selected")
                const italicNode = document.createElement(tagName)
                if (tagName === 'h1' || tagName === 'h2') {
                  italicNode.style.display = 'inline'
                }
                const notSelectedPart = textNode.data.slice(0, startOffset)
                const selectedPart = textNode.data.slice(startOffset, textNode.length)

                italicNode.append(selectedPart)
                textNode.replaceWith(notSelectedPart, italicNode)
                updatedSelectedNodes.push(italicNode)
              }

              if (isLastLine) {
                console.log("last of multiple lines is not fully selected")
                const italicNode = document.createElement(tagName)
                if (tagName === 'h1' || tagName === 'h2') {
                  italicNode.style.display = 'inline'
                }
                const selectedPart = textNode.data.slice(0, endOffset)
                const notSelectedPart = textNode.data.slice(endOffset, textNode.length)

                italicNode.append(selectedPart)
                textNode.replaceWith(italicNode, notSelectedPart)
                updatedSelectedNodes.push(italicNode)
              }
            }

          }
        } else {
          console.log("node without text")
          updatedSelectedNodes.push(selectedNode)
        }
      })
    })

    if (updatedSelectedNodes.length && !collapsed) {
      // this.setIsItalicIconActive(!this.isItalicActive)
      // console.log("updatedSelectedNodes: ", updatedSelectedNodes)

      Editor.selectRange({
        startNode: updatedSelectedNodes[0],
        endNode: updatedSelectedNodes[updatedSelectedNodes.length - 1],
      })
    }
  }

  handleItalicClick = () => this.handleActionClick('i')

  handleBoldClick = () => this.handleActionClick('b')

  handleH1Click = () => this.handleActionClick('h1')

  handleH2Click = () => this.handleActionClick('h2')
}
