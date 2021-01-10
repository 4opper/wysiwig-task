// TODO implement turning style off
// TODO check collapsed case
// TODO fix case when there are multiple empty lines in the end and other text are selected and
// after style update visual selection increases by 1 line and ctrl+A case
// TODO make headings work in office
// TODO can try to get rid of filtered and simple selectedNodes to edit selection on selectionChanges
// (filtered selectedNodes fixes case when end of prev line or start of next line is kinda selected, but no chars are selected on this prev/next line)
// TODO mb perform normalize when unstyling
// TODO fix ctrl + A doesnt style last node
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

    if (selection.isCollapsed || !selection.rangeCount) {
      return [];
    }

    var range = selection.getRangeAt(0)
    var node1 = selection.anchorNode;
    var node2 = selection.focusNode;
    var selectionAncestor = range.commonAncestorContainer;
    if (selectionAncestor == null) {
      return [];
    }

    const selectedNodes = this.getNodesBetween(selectionAncestor, node1, node2)

    // Filters out nodes that doesn't have selected chars
    const filteredSelectedNodes = selectedNodes.filter((selectedNode, index) => {
      if (index === 0) {
        return range.startOffset < selectedNode.textContent.length
      }

      if (index === selectedNodes.length - 1) {
        return range.endOffset > 0
      }

      return true
    })

    return { selectedNodes, filteredSelectedNodes, range }
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

  getTextNodes = (node) => {
    function recursor(n) {
      var i, a = [];
      if (n.nodeType !== 3) {
        if (n.childNodes)
          for (i = 0; i < n.childNodes.length; ++i)
            a = a.concat(recursor(n.childNodes[i]));
      } else
        a.push(n);
      return a.filter(textNode => document.getSelection().containsNode(textNode));
    }
    return recursor(node);
  }

  getSelectedTextNodes = (node) => {
    const allTextNodes = this.getTextNodes(node)

    return allTextNodes.filter(textNode => document.getSelection().containsNode(textNode))
  }
  
  constructor (caret, editorNode) {
    this.caret = caret
    this.editorNode = editorNode
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
    const { selectedNodes, filteredSelectedNodes, range } = this.getSelectedNodes()
    
    if (!range) {
      console.log("not focused")
      return 
    }
    
    const { startContainer, startOffset, endContainer, endOffset, collapsed } = range
    const updatedSelectedNodes = []

    // console.log("filteredSelectedNodes: ", filteredSelectedNodes)

    const isSelectionAlreadyWrapped = filteredSelectedNodes.every((selectedNode) => {
      const textNodes = this.getSelectedTextNodes(selectedNode)
      // console.log("textNodes: ", textNodes)

      const isAlreadyWrapped = textNodes.every(textNode => {
        const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
        // console.log("textNodeParents: ", textNodeParents)

        return textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)
      })

      // console.log("isAlreadyWrapped: ", isAlreadyWrapped)
      return isAlreadyWrapped
    })

    if (isSelectionAlreadyWrapped) {
      console.log("already wrapped")
      filteredSelectedNodes.forEach((selectedNode) => {
        const textNodes = this.getSelectedTextNodes(selectedNode)
        // console.log("textNodes: ", textNodes)
        // debugger

        textNodes.forEach((textNode, index) => {
          if (startContainer === endContainer) {
            console.log("single text node")
            const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
            const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
            const replaceWithNodes = []
            const selectedText = range.toString()
            const textBeforeSelected = textNode.data.slice(0, range.startOffset)
            const textAfterSelected = textNode.data.slice(range.endOffset, textNode.length)

            if (textBeforeSelected) {
              const tagNode = document.createElement(tagName)
              tagNode.append(textBeforeSelected)
              replaceWithNodes.push(tagNode)
            }

            if (selectedText) {
              const textNodeWithoutStyle = document.createTextNode(selectedText)
              replaceWithNodes.push(textNodeWithoutStyle)
              updatedSelectedNodes.push(textNodeWithoutStyle)
            }

            if (textAfterSelected) {
              const tagNode = document.createElement(tagName)
              tagNode.append(textAfterSelected)
              replaceWithNodes.push(tagNode)
            }

            styleNode.replaceWith(...replaceWithNodes)
          } else {
            const isFirstLine = selectedNode === filteredSelectedNodes[0]
            const isLastLine = selectedNode === filteredSelectedNodes[filteredSelectedNodes.length - 1]

            if ((isFirstLine && startOffset === 0) || (isLastLine && endOffset === endContainer.length) || (!isFirstLine && !isLastLine))  {
              console.log("one of multiple lines is fully selected")
              const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
              const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
              styleNode.replaceWith(styleNode.firstChild)
              updatedSelectedNodes.push(textNode)
            } else {
              if (isFirstLine) {
                const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
                const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
                const notSelectedText = textNode.data.slice(0, startOffset)
                const selectedText = textNode.data.slice(startOffset, textNode.length)
                const textNodeWithoutStyle = document.createTextNode(selectedText)
                const tagNode = document.createElement(tagName)
                tagNode.append(notSelectedText)

                styleNode.replaceWith(tagNode, textNodeWithoutStyle)
                updatedSelectedNodes.push(textNodeWithoutStyle)
              }

              if (isLastLine) {
                const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
                const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
                const selectedText = textNode.data.slice(0, endOffset)
                const notSelectedText = textNode.data.slice(endOffset, textNode.length)
                const textNodeWithoutStyle = document.createTextNode(selectedText)
                const tagNode = document.createElement(tagName)
                tagNode.append(notSelectedText)

                styleNode.replaceWith(textNodeWithoutStyle, tagNode)
                updatedSelectedNodes.push(textNodeWithoutStyle)
              }
            }


          }

          // if (index === textNodes.length - 1) {
          //   var a = styleNodeChild.parentNode
          // }

        })
      })
    } else {
      filteredSelectedNodes.forEach((selectedNode, index) => {
        const textNodes = this.getSelectedTextNodes(selectedNode)
        const isAlreadyWrapped = textNodes.every(textNode => {
          const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)

          return textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)
        })

        if (isAlreadyWrapped) {
          console.log("whole node is already wrapped")
          const textNodes = this.getTextNodes(selectedNode)
          updatedSelectedNodes.push(...textNodes)
          return
        }

        textNodes.forEach(textNode => {
          const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
          const isTextNodeAlreadyWrapped = textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)

          if (!isTextNodeAlreadyWrapped) {
            if (startContainer === endContainer) /*Single selectedNode selected or has caret*/ {
              console.log("single selectedNode")
              // let nodeToSelect = textNode
              // let startOffsetToUse = startOffset
              // let endOffsetToUse = endOffset

              // if (collapsed) /*Nothing is selected*/ {
              //   console.log("nothing is selected")
              //   const charBeforeCaret = textNode.data[startOffset - 1]
              //   const charAfterCaret = textNode.data[startOffset]
              //
              //   if (charBeforeCaret && charBeforeCaret !== ' ' && charAfterCaret &&  charAfterCaret !== ' ') /*Inside word*/ {
              //     const { range: wordRange } = this.caret.selectWordAtCaret()
              //     const word = wordRange.toString()
              //     const start = textNode.data.slice(0, wordRange.startOffset)
              //     const end = textNode.data.slice(wordRange.endOffset, textNode.length)
              //     const italicNode = document.createElement(tagName)
              //     if (tagName === 'h1' || tagName === 'h2') {
              //       italicNode.style.display = 'inline'
              //     }
              //
              //     italicNode.append(word)
              //
              //     textNode.replaceWith(start, italicNode, end)
              //
              //     updatedSelectedNodes.push(italicNode.firstChild)
              //
              //     nodeToSelect = italicNode.firstChild
              //     startOffsetToUse = startOffset - start.length
              //     endOffsetToUse = startOffset - start.length
              //   }
              //
              //   if (updatedSelectedNodes.length) {
              //     // this.setIsItalicIconActive(!this.isItalicActive)
              //
              //     Editor.selectRange({
              //       startNode: nodeToSelect,
              //       startOffset: startOffsetToUse,
              //       endNode: nodeToSelect,
              //       endOffset: endOffsetToUse,
              //     })
              //
              //   }
              //
              //   return
              // }
              if (!collapsed) /*Any part of selectedNode is selected*/  {
                console.log("inner part of word or whole word")
                const replaceWithNodes = []
                const selectedText = range.toString()
                const textBeforeSelected = textNode.data.slice(0, range.startOffset)
                const textAfterSelected = textNode.data.slice(range.endOffset, textNode.length)

                const italicNode = document.createElement(tagName)
                if (tagName === 'h1' || tagName === 'h2') {
                  italicNode.style.display = 'inline'
                }

                if (textBeforeSelected) replaceWithNodes.push(textBeforeSelected)
                if (selectedText) replaceWithNodes.push(italicNode)
                if (textAfterSelected) replaceWithNodes.push(textAfterSelected)

                italicNode.append(selectedText)
                textNode.replaceWith(...replaceWithNodes)
                updatedSelectedNodes.push(italicNode.firstChild)
              }
            } else /*Multiple selectedNode selected or has caret*/ {
              const isFirstLine = selectedNode === filteredSelectedNodes[0]
              const isLastLine = selectedNode === filteredSelectedNodes[filteredSelectedNodes.length - 1]

              if ((isFirstLine && startOffset === 0) || (isLastLine && endOffset === endContainer.length) || (!isFirstLine && !isLastLine))  {
                console.log("one of multiple lines is fully selected")
                const italicNode = document.createElement(tagName)
                if (tagName === 'h1' || tagName === 'h2') {
                  italicNode.style.display = 'inline'
                }
                const clonedNode = textNode.cloneNode()

                italicNode.append(clonedNode)
                textNode.replaceWith(italicNode)
                updatedSelectedNodes.push(italicNode.firstChild)
              } else {
                if (isFirstLine) {
                  console.log("first of multiple lines is not fully selected")
                  const italicNode = document.createElement(tagName)
                  if (tagName === 'h1' || tagName === 'h2') {
                    italicNode.style.display = 'inline'
                  }
                  const notSelectedText = textNode.data.slice(0, startOffset)
                  const selectedText = textNode.data.slice(startOffset, textNode.length)

                  italicNode.append(selectedText)
                  textNode.replaceWith(notSelectedText, italicNode)
                  updatedSelectedNodes.push(italicNode.firstChild)
                }

                if (isLastLine) {
                  console.log("last of multiple lines is not fully selected")
                  const italicNode = document.createElement(tagName)
                  if (tagName === 'h1' || tagName === 'h2') {
                    italicNode.style.display = 'inline'
                  }
                  const selectedText = textNode.data.slice(0, endOffset)
                  const notSelectedText = textNode.data.slice(endOffset, textNode.length)

                  italicNode.append(selectedText)
                  textNode.replaceWith(italicNode, notSelectedText)
                  updatedSelectedNodes.push(italicNode.firstChild)
                }
              }

            }
          } else {
            console.log("text node is already wrapped")
            const textNodes = this.getTextNodes(selectedNode)
            updatedSelectedNodes.push(...textNodes)
          }
        })
      })
    }
    
    if (updatedSelectedNodes.length && !collapsed) {
      const startNode = updatedSelectedNodes[0]
      const endNode = updatedSelectedNodes[updatedSelectedNodes.length - 1]

      Editor.selectRange({
        startNode,
        endNode: endNode,
        endOffset: endNode.textContent.length
      })
    }
  }

  handleItalicClick = () => this.handleActionClick('i')

  handleBoldClick = () => this.handleActionClick('b')

  handleH1Click = () => this.handleActionClick('h1')

  handleH2Click = () => this.handleActionClick('h2')
}
