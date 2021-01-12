// TODO fix bugs
// TODO test very well
// TODO refactor
// TODO get collapsed case back and make it work
// TODO highlight buttons
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
      return { selectedNodes: [], filteredSelectedNodes: [] };
    }

    var range = selection.getRangeAt(0)
    var node1 = selection.anchorNode;
    var node2 = selection.focusNode;
    var selectionAncestor = range.commonAncestorContainer;
    if (selectionAncestor == null) {
      return { selectedNodes: [], filteredSelectedNodes: [] };
    }

    const selectedNodes = this.getNodesBetween(selectionAncestor, node1, node2)

    // TODO test cases with multiple lines, with and without empty selections on the end
    let hasUpdatedStart = false
    let hasUpdatedEnd = false
    // Filters out nodes that don't have selected chars
    const filteredSelectedNodes = selectedNodes.filter((selectedNode, index) => {
      if (index === 0) {
        const result = range.startOffset >= selectedNode.textContent.length ? false : true

        if (!result) {
          console.log("update start")
          hasUpdatedStart = true
        }

        return result
      }

      if (index === selectedNodes.length - 1) {
        const result = range.endOffset <= 0 ? false : true

        if (!result) {
          console.log("update end")
          hasUpdatedEnd = true
        }

        return result
      }

      return true
    })
    // TODO make it in single iteration
    const selectedTextNodes = []

    filteredSelectedNodes.forEach(selectedNode => {
      selectedTextNodes.push(...this.getTextNodes(selectedNode))
    })

    if (hasUpdatedStart && hasUpdatedEnd) {
      Editor.selectRange({
        startNode: selectedTextNodes[0],
        endNode: selectedTextNodes[selectedTextNodes.length - 1],
        endOffset: selectedTextNodes[selectedTextNodes.length - 1].textContent.length,
      })
    } else if (hasUpdatedStart) {
      Editor.selectRange({
        startNode: selectedTextNodes[0],
        endNode: range.endContainer,
        endOffset: range.endOffset,
      })
    } else if (hasUpdatedEnd) {
      Editor.selectRange({
        startNode: range.startContainer,
        startOffset: range.startOffset,
        endNode: selectedTextNodes[selectedTextNodes.length - 1],
        endOffset: selectedTextNodes[selectedTextNodes.length - 1].textContent.length,
      })
    }

    console.log("original selectedNodes: ", selectedNodes)

    return { selectedTextNodes }
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
  
  constructor (editorNode) {
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

  addStylesForHeading = (node, tagName) => {
    const DEFAULT_FONT_SIZE = 16
    node.style.fontWeight = 'bold'


    if (tagName === 'h1') {
      node.style.fontSize = `${DEFAULT_FONT_SIZE * 2}px`
    }

    if (tagName === 'h2') {
      node.style.fontSize = `${DEFAULT_FONT_SIZE * 1.5}px`
    }
  }

  createStyleNode = (tagName) => {
    if (tagName !== 'h1' && tagName !== 'h2') {
      return document.createElement(tagName)
    }

    const styleNode = document.createElement('span')
    this.addStylesForHeading(styleNode, tagName)

    return styleNode
  }

  handleActionClick = (tagName) => {
    const { selectedTextNodes } = this.getSelectedNodes()
    const range = document.getSelection().getRangeAt(0)
    console.log("selectedTextNodes: ", selectedTextNodes)

    if (!range) {
      console.log("not focused or nothing is selected")
      return
    }
    
    let { startContainer, startOffset, endContainer, endOffset, collapsed } = range
    const updatedSelectedNodes = []
    let updatedStartOffset = undefined
    let updatedEndOffset = undefined

    const isSelectionAlreadyWrapped = selectedTextNodes.every(textNode => {
      const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)

      return textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)
    })

    debugger

    if (isSelectionAlreadyWrapped) /*remove styles case*/ {
      console.log("already wrapped")

      selectedTextNodes.forEach((newSelectedTextNode) => {
        if (selectedTextNodes.length === 1) {
          console.log("single text node")
          const textNodeParents = this.getNodeParentsUntil(newSelectedTextNode, this.editorNode)
          const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
          const replaceWithNodes = []
          const selectedText = range.toString()
          const textBeforeSelected = newSelectedTextNode.data.slice(0, range.startOffset)
          const textAfterSelected = newSelectedTextNode.data.slice(range.endOffset, newSelectedTextNode.length)

          if (textBeforeSelected) {
            const tagNode = this.createStyleNode(tagName)
            tagNode.append(textBeforeSelected)
            replaceWithNodes.push(tagNode)
          }

          if (selectedText) {
            const textNodeWithoutStyle = document.createTextNode(selectedText)
            replaceWithNodes.push(textNodeWithoutStyle)
            updatedSelectedNodes.push(textNodeWithoutStyle)
          }

          if (textAfterSelected) {
            const tagNode = this.createStyleNode(tagName)
            tagNode.append(textAfterSelected)
            replaceWithNodes.push(tagNode)
          }

          styleNode.replaceWith(...replaceWithNodes)
        } else {
          const isFirstNode = newSelectedTextNode === selectedTextNodes[0]
          const isLastNode = newSelectedTextNode === selectedTextNodes[selectedTextNodes.length - 1]

          if ((isFirstNode && startOffset === 0) || (isLastNode && endOffset === endContainer.length) || (!isFirstNode && !isLastNode))  {
            console.log("one of multiple nodes is fully selected")
            const textNodeParents = this.getNodeParentsUntil(newSelectedTextNode, this.editorNode)
            const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
            styleNode.replaceWith(styleNode.firstChild)
            updatedSelectedNodes.push(newSelectedTextNode)
          } else {
            if (isFirstNode) {
              const textNodeParents = this.getNodeParentsUntil(newSelectedTextNode, this.editorNode)
              const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
              const notSelectedText = newSelectedTextNode.data.slice(0, startOffset)
              const selectedText = newSelectedTextNode.data.slice(startOffset, newSelectedTextNode.length)
              const textNodeWithoutStyle = document.createTextNode(selectedText)
              const tagNode = this.createStyleNode(tagName)
              tagNode.append(notSelectedText)

              styleNode.replaceWith(tagNode, textNodeWithoutStyle)
              updatedSelectedNodes.push(textNodeWithoutStyle)
            }

            if (isLastNode) {
              const textNodeParents = this.getNodeParentsUntil(newSelectedTextNode, this.editorNode)
              const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
              const selectedText = newSelectedTextNode.data.slice(0, endOffset)
              const notSelectedText = newSelectedTextNode.data.slice(endOffset, newSelectedTextNode.length)
              const textNodeWithoutStyle = document.createTextNode(selectedText)
              const tagNode = this.createStyleNode(tagName)
              tagNode.append(notSelectedText)

              styleNode.replaceWith(textNodeWithoutStyle, tagNode)
              updatedSelectedNodes.push(textNodeWithoutStyle)
            }
          }
        }
      })
    } else /*add styles case*/ {
      selectedTextNodes.forEach((newSelectedTextNode, selectedNodeIndex) => {
        const textNodeParents = this.getNodeParentsUntil(newSelectedTextNode, this.editorNode)
        const isAlreadyWrapped = textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)

        if (isAlreadyWrapped) {
          console.log("whole node is already wrapped")
          // const textNodes = this.getTextNodes(selectedNode)

          if (selectedNodeIndex === 0) {
            updatedStartOffset = endOffset
          }

          if (selectedNodeIndex === selectedTextNodes.length - 1) {
            updatedEndOffset = endOffset
          }

          updatedSelectedNodes.push(newSelectedTextNode)

          // if (textNodes.length) {
          //   updatedSelectedNodes.push(...textNodes)
          // } else {
          //   updatedSelectedNodes.push(selectedNode)
          // }

          return
        }

        if (selectedTextNodes.length === 1) /*Single selectedNode selected or has caret*/ {
          console.log("single selectedTextNode")
          const replaceWithNodes = []
          const selectedText = range.toString()
          const textBeforeSelected = newSelectedTextNode.data.slice(0, range.startOffset)
          const textAfterSelected = newSelectedTextNode.data.slice(range.endOffset, newSelectedTextNode.length)
          const italicNode = this.createStyleNode(tagName)

          if (textBeforeSelected) replaceWithNodes.push(textBeforeSelected)
          if (selectedText) replaceWithNodes.push(italicNode)
          if (textAfterSelected) replaceWithNodes.push(textAfterSelected)

          italicNode.append(selectedText)
          newSelectedTextNode.replaceWith(...replaceWithNodes)
          updatedSelectedNodes.push(italicNode.firstChild)
        } else /*Multiple selectedNode selected or has caret*/ {
          const isFirstNode = newSelectedTextNode === selectedTextNodes[0]
          const isLastNode = newSelectedTextNode === selectedTextNodes[selectedTextNodes.length - 1]

          if ((isFirstNode && startOffset === 0) || (isLastNode && endOffset === endContainer.length) || (!isFirstNode && !isLastNode))  {
            console.log("one of multiple nodes is fully selected")
            const italicNode = this.createStyleNode(tagName)
            const clonedNode = newSelectedTextNode.cloneNode()

            italicNode.append(clonedNode)
            newSelectedTextNode.replaceWith(italicNode)
            updatedSelectedNodes.push(italicNode.firstChild)
          } else {
            if (isFirstNode) {
              console.log("first of multiple nodes is not fully selected")
              const italicNode = this.createStyleNode(tagName)
              const notSelectedText = newSelectedTextNode.data.slice(0, startOffset)
              const selectedText = newSelectedTextNode.data.slice(startOffset, newSelectedTextNode.length)

              italicNode.append(selectedText)
              newSelectedTextNode.replaceWith(notSelectedText, italicNode)
              updatedSelectedNodes.push(italicNode.firstChild)
            }

            if (isLastNode) {
              console.log("last of multiple nodes is not fully selected")
              const italicNode = this.createStyleNode(tagName)
              const selectedText = newSelectedTextNode.data.slice(0, endOffset)
              const notSelectedText = newSelectedTextNode.data.slice(endOffset, newSelectedTextNode.length)

              italicNode.append(selectedText)
              newSelectedTextNode.replaceWith(italicNode, notSelectedText)
              updatedSelectedNodes.push(italicNode.firstChild)
            }
          }

        }
      })
    }
    
    if (updatedSelectedNodes.length && !collapsed) {
      const startNode = updatedSelectedNodes[0]
      const endNode = updatedSelectedNodes[updatedSelectedNodes.length - 1]
      console.log("updatedSelectedNodes: ", updatedSelectedNodes)

      Editor.selectRange({
        startNode,
        startOffset: updatedStartOffset,
        endNode,
        endOffset: updatedEndOffset || endNode.textContent.length || undefined,
      })
    }

    // Normalize on removing styles
    if (updatedSelectedNodes.length && isSelectionAlreadyWrapped) {
      updatedSelectedNodes.forEach(updatedNode => {
        const parent = updatedNode.parentNode

        if (parent) parent.normalize()
      })
    }
  }

  handleItalicClick = () => this.handleActionClick('i')

  handleBoldClick = () => this.handleActionClick('b')

  handleH1Click = () => this.handleActionClick('h1')

  handleH2Click = () => this.handleActionClick('h2')
}
