// TODO get collapsed case back and make it work
// TODO can try to get rid of filtered and simple selectedNodes to edit selection on selectionChanges
// (filtered selectedNodes fixes case when end of prev line or start of next line is kinda selected, but no chars are selected on this prev/next line)
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
    const { selectedNodes, filteredSelectedNodes, range } = this.getSelectedNodes()
    console.log("selectedNodes: ", selectedNodes)
    if (!range) {
      console.log("not focused or nothing is selected")
      return
    }
    
    let { startContainer, startOffset, endContainer, endOffset, collapsed } = range
    const updatedSelectedNodes = []

    const isSelectionAlreadyWrapped = filteredSelectedNodes.every((selectedNode) => {
      const textNodes = this.getSelectedTextNodes(selectedNode)

      const isAlreadyWrapped = textNodes.every(textNode => {
        const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)

        return textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)
      })

      return isAlreadyWrapped
    })

    if (isSelectionAlreadyWrapped) /*remove styles case*/ {
      console.log("already wrapped")
      selectedNodes.forEach((selectedNode) => {
        if (!filteredSelectedNodes.includes(selectedNode)) {
          console.log("selected node with 0 visually selected chars")
          // case when end of prevLine or start of next line is selected
          if (selectedNode.textContent.length !== 0) {
            return
          }

          // Empty line case
          updatedSelectedNodes.push(selectedNode)
          return
        }

        const textNodes = this.getSelectedTextNodes(selectedNode)
        
        if (!textNodes.length) {
          console.log("selected node without text")
          updatedSelectedNodes.push(selectedNode)
        }

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
            const isFirstNode = selectedNode === filteredSelectedNodes[0]
            const isLastNode = selectedNode === filteredSelectedNodes[filteredSelectedNodes.length - 1]

            if ((isFirstNode && startOffset === 0) || (isLastNode && endOffset === endContainer.length) || (!isFirstNode && !isLastNode))  {
              console.log("one of multiple nodes is fully selected")
              const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
              const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
              styleNode.replaceWith(styleNode.firstChild)
              updatedSelectedNodes.push(textNode)
            } else {
              if (isFirstNode) {
                const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
                const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
                const notSelectedText = textNode.data.slice(0, startOffset)
                const selectedText = textNode.data.slice(startOffset, textNode.length)
                const textNodeWithoutStyle = document.createTextNode(selectedText)
                const tagNode = this.createStyleNode(tagName)
                tagNode.append(notSelectedText)

                styleNode.replaceWith(tagNode, textNodeWithoutStyle)
                updatedSelectedNodes.push(textNodeWithoutStyle)
              }

              if (isLastNode) {
                const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
                const styleNode = textNodeParents.find(parentNode => parentNode.tagName.toLowerCase() === tagName)
                const selectedText = textNode.data.slice(0, endOffset)
                const notSelectedText = textNode.data.slice(endOffset, textNode.length)
                const textNodeWithoutStyle = document.createTextNode(selectedText)
                const tagNode = this.createStyleNode(tagName)
                tagNode.append(notSelectedText)

                styleNode.replaceWith(textNodeWithoutStyle, tagNode)
                updatedSelectedNodes.push(textNodeWithoutStyle)
              }
            }


          }
        })
      })
    } else /*add styles case*/ {
      selectedNodes.forEach((selectedNode, selectedNodeIndex) => {
        if (!filteredSelectedNodes.includes(selectedNode)) {
          console.log("selected node with 0 visually selected chars")
          // case when end of prev line or start of next line is selected
          if (selectedNode.textContent.length !== 0) {
            return
          }

          // Empty line case
          updatedSelectedNodes.push(selectedNode)
          return
        }
        
        const textNodes = this.getSelectedTextNodes(selectedNode)
        const isAlreadyWrapped = textNodes.every(textNode => {
          const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)

          return textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)
        })

        if (isAlreadyWrapped) {
          console.log("whole node is already wrapped")
          const textNodes = this.getTextNodes(selectedNode)

          if (textNodes.length) {
            updatedSelectedNodes.push(...textNodes)
          } else {
            updatedSelectedNodes.push(selectedNode)
          }

          return
        }

        textNodes.forEach((textNode, textNodeIndex) => {
          if (selectedNodeIndex === filteredSelectedNodes.length - 1 && textNodeIndex === textNodes.length - 1) {
            const lastVisuallySelectedNode = filteredSelectedNodes[filteredSelectedNodes.length - 1]
            endContainer = lastVisuallySelectedNode
            endOffset = lastVisuallySelectedNode.textContent.length
          }

          const textNodeParents = this.getNodeParentsUntil(textNode, this.editorNode)
          const isTextNodeAlreadyWrapped = textNodeParents.some(parentNode => parentNode.tagName.toLowerCase() === tagName)

          if (!isTextNodeAlreadyWrapped) {
            if (startContainer === endContainer) /*Single selectedNode selected or has caret*/ {
              console.log("single selectedNode")
              if (!collapsed) /*Any part of selectedNode is selected*/  {
                console.log("inner part of word or whole word")
                const replaceWithNodes = []
                const selectedText = range.toString()
                const textBeforeSelected = textNode.data.slice(0, range.startOffset)
                const textAfterSelected = textNode.data.slice(range.endOffset, textNode.length)
                const italicNode = this.createStyleNode(tagName)

                if (textBeforeSelected) replaceWithNodes.push(textBeforeSelected)
                if (selectedText) replaceWithNodes.push(italicNode)
                if (textAfterSelected) replaceWithNodes.push(textAfterSelected)

                italicNode.append(selectedText)
                textNode.replaceWith(...replaceWithNodes)
                updatedSelectedNodes.push(italicNode.firstChild)
              }
            } else /*Multiple selectedNode selected or has caret*/ {
              const isFirstNode = selectedNode === filteredSelectedNodes[0]
              const isLastNode = selectedNode === filteredSelectedNodes[filteredSelectedNodes.length - 1]

              if ((isFirstNode && startOffset === 0) || (isLastNode && endOffset === endContainer.length) || (!isFirstNode && !isLastNode))  {
                console.log("one of multiple nodes is fully selected")
                const italicNode = this.createStyleNode(tagName)
                const clonedNode = textNode.cloneNode()

                italicNode.append(clonedNode)
                textNode.replaceWith(italicNode)
                updatedSelectedNodes.push(italicNode.firstChild)
              } else {
                if (isFirstNode) {
                  console.log("first of multiple nodes is not fully selected")
                  const italicNode = this.createStyleNode(tagName)
                  const notSelectedText = textNode.data.slice(0, startOffset)
                  const selectedText = textNode.data.slice(startOffset, textNode.length)

                  italicNode.append(selectedText)
                  textNode.replaceWith(notSelectedText, italicNode)
                  updatedSelectedNodes.push(italicNode.firstChild)
                }

                if (isLastNode) {
                  console.log("last of multiple nodes is not fully selected")
                  const italicNode = this.createStyleNode(tagName)
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

            if (textNodes.length) {
              updatedSelectedNodes.push(...textNodes)
            } else {
              updatedSelectedNodes.push(selectedNode)
            }
          }
        })
      })
    }
    
    if (updatedSelectedNodes.length && !collapsed) {
      const startNode = updatedSelectedNodes[0]
      const endNode = updatedSelectedNodes[updatedSelectedNodes.length - 1]
      console.log("updatedSelectedNodes: ", updatedSelectedNodes)

      Editor.selectRange({
        startNode,
        endNode: endNode,
        endOffset: endNode.textContent.length || undefined,
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
