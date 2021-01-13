// TODO refactor
// TODO use tagName uppercased (as it is in node) to decrease change of error
// TODO test very well
// TODO test in different browsers
// TODO mb move selection + range thinks to separate file also
import {
  getNodeParentsUntil,
  getNodesBetween, getParentNodeWithTag,
  getTextNodes,
  isAlreadyWrappedInTag,
} from './domUtils'

export class Editor {
  static DEFAULT_FONT_SIZE = 16

  static getSelection = () => document.getSelection()

  static getRange = () => Editor.getSelection().getRangeAt(0)

  static createRange = () => document.createRange()

  static createTextNode = (text) => document.createTextNode(text)

  static selectRange = ({
    startNode,
    startOffset = 0,
    endNode,
    endOffset = 1,
  }) => {
    const range = Editor.createRange()
    const selection = Editor.getSelection()

    selection.removeAllRanges()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    selection.addRange(range)
  }

  constructor(editorNode) {
    this.editorNode = editorNode
  }

  handleItalicClick = () => this.handleActionClick("i")

  handleBoldClick = () => this.handleActionClick("b")

  handleH1Click = () => this.handleActionClick("h1")

  handleH2Click = () => this.handleActionClick("h2")

  handleActionClick = (tagName) => {
    const selectedTextNodes = this.getSelectedTextNodes()
    const range = Editor.getRange()

    if (!range) {
      return
    }

    const {
      endOffset,
      collapsed,
    } = range
    const updatedSelectedNodes = []
    const isSelectionAlreadyWrapped = selectedTextNodes.every((textNode) => isAlreadyWrappedInTag({ node: textNode, tagName, rootNode: this.editorNode }))
    let updatedStartOffset = undefined
    let updatedEndOffset = undefined

    selectedTextNodes.forEach((newSelectedTextNode, selectedNodeIndex) => {
      if (!isSelectionAlreadyWrapped) {
        const isAlreadyWrapped = isAlreadyWrappedInTag({ node: newSelectedTextNode, tagName, rootNode: this.editorNode })

        if (isAlreadyWrapped) {
          console.log("whole node is already wrapped")
          if (selectedNodeIndex === 0) {
            updatedStartOffset = endOffset
          }

          if (selectedNodeIndex === selectedTextNodes.length - 1) {
            updatedEndOffset = endOffset
          }

          updatedSelectedNodes.push(newSelectedTextNode)

          return
        }
      }

      if (selectedTextNodes.length === 1) {
        this.handleSingleTextNodeSelected({
          isSelectionAlreadyWrapped,
          range,
          newSelectedTextNode,
          updatedSelectedNodes,
          tagName,
        })
      } else {
        this.handleMultipleTextNodesSelected({
          isSelectionAlreadyWrapped,
          range,
          newSelectedTextNode,
          updatedSelectedNodes,
          tagName,
          selectedTextNodes,
        })
      }
    })

    if (updatedSelectedNodes.length && !collapsed) {
      this.updateSelection({ updatedSelectedNodes, updatedStartOffset, updatedEndOffset })
    }

    // Normalize on removing styles
    if (updatedSelectedNodes.length && isSelectionAlreadyWrapped) {
      this.normalizeSelectedNodes(updatedSelectedNodes)
    }
  }

  handleSingleTextNodeSelected = ({ isSelectionAlreadyWrapped, updatedSelectedNodes, newSelectedTextNode, range, tagName }) => {
    console.log("single text node")
    const styleNode = getParentNodeWithTag({ node: newSelectedTextNode, tagName, rootNode: this.editorNode })
    const replaceWithNodes = []
    const selectedText = range.toString()
    const textBeforeSelected = newSelectedTextNode.data.slice(
      0,
      range.startOffset
    )
    const textAfterSelected = newSelectedTextNode.data.slice(
      range.endOffset,
      newSelectedTextNode.length
    )

    if (isSelectionAlreadyWrapped) {
      if (textBeforeSelected) {
        const tagNode = this.createStyleNode(tagName)
        tagNode.append(textBeforeSelected)
        replaceWithNodes.push(tagNode)
      }

      if (selectedText) {
        const textNodeWithoutStyle = Editor.createTextNode(selectedText)
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
      const wrapperNode = this.createStyleNode(tagName)

      if (textBeforeSelected) replaceWithNodes.push(textBeforeSelected)
      if (selectedText) replaceWithNodes.push(wrapperNode)
      if (textAfterSelected) replaceWithNodes.push(textAfterSelected)

      wrapperNode.append(selectedText)
      newSelectedTextNode.replaceWith(...replaceWithNodes)
      updatedSelectedNodes.push(wrapperNode.firstChild)
    }
  }

  handleMultipleTextNodesSelected = ({ isSelectionAlreadyWrapped, updatedSelectedNodes, newSelectedTextNode, range, tagName, selectedTextNodes }) => {
    const { startOffset, endOffset, endContainer } = range
    const isFirstNode = newSelectedTextNode === selectedTextNodes[0]
    const isLastNode =
      newSelectedTextNode ===
      selectedTextNodes[selectedTextNodes.length - 1]

    if (
      (isFirstNode && startOffset === 0) ||
      (isLastNode && endOffset === endContainer.length) ||
      (!isFirstNode && !isLastNode)
    ) {
      console.log("one of multiple nodes is fully selected")
      if (isSelectionAlreadyWrapped) {
        const styleNode = getParentNodeWithTag({ node: newSelectedTextNode, tagName, rootNode: this.editorNode })

        styleNode.replaceWith(styleNode.firstChild)
        updatedSelectedNodes.push(newSelectedTextNode)
      } else {
        const wrapperNode = this.createStyleNode(tagName)
        const clonedNode = newSelectedTextNode.cloneNode()

        wrapperNode.append(clonedNode)
        newSelectedTextNode.replaceWith(wrapperNode)
        updatedSelectedNodes.push(wrapperNode.firstChild)
      }
    } else {
      if (isFirstNode) {
        console.log("first of multiple nodes is not fully selected")
        const notSelectedText = newSelectedTextNode.data.slice(
          0,
          startOffset
        )
        const selectedText = newSelectedTextNode.data.slice(
          startOffset,
          newSelectedTextNode.length
        )

        if (isSelectionAlreadyWrapped) {
          const styleNode = getParentNodeWithTag({ node: newSelectedTextNode, tagName, rootNode: this.editorNode })
          const textNodeWithoutStyle = Editor.createTextNode(selectedText)
          const tagNode = this.createStyleNode(tagName)

          tagNode.append(notSelectedText)
          styleNode.replaceWith(tagNode, textNodeWithoutStyle)
          updatedSelectedNodes.push(textNodeWithoutStyle)
        } else {
          const wrapperNode = this.createStyleNode(tagName)

          wrapperNode.append(selectedText)
          newSelectedTextNode.replaceWith(notSelectedText, wrapperNode)
          updatedSelectedNodes.push(wrapperNode.firstChild)
        }
      }

      if (isLastNode) {
        console.log("last of multiple nodes is not fully selected")
        const selectedText = newSelectedTextNode.data.slice(0, endOffset)
        const notSelectedText = newSelectedTextNode.data.slice(
          endOffset,
          newSelectedTextNode.length
        )

        if (isSelectionAlreadyWrapped) {
          const styleNode = getParentNodeWithTag({ node: newSelectedTextNode, tagName, rootNode: this.editorNode })
          const textNodeWithoutStyle = Editor.createTextNode(selectedText)
          const tagNode = this.createStyleNode(tagName)

          tagNode.append(notSelectedText)
          styleNode.replaceWith(textNodeWithoutStyle, tagNode)
          updatedSelectedNodes.push(textNodeWithoutStyle)
        } else {
          const italicNode = this.createStyleNode(tagName)

          italicNode.append(selectedText)
          newSelectedTextNode.replaceWith(italicNode, notSelectedText)
          updatedSelectedNodes.push(italicNode.firstChild)
        }
      }
    }
  }

  updateSelection = ({ updatedSelectedNodes, updatedStartOffset, updatedEndOffset }) => {
    const startNode = updatedSelectedNodes[0]
    const endNode = updatedSelectedNodes[updatedSelectedNodes.length - 1]
    console.log("updatedSelectedNodes: ", updatedSelectedNodes)

    Editor.selectRange({
      startNode,
      startOffset: updatedStartOffset,
      endNode,
      endOffset: updatedEndOffset || endNode.textContent.length || 1,
    })
  }
  
  normalizeSelectedNodes = (updatedSelectedNodes) => {
    updatedSelectedNodes.forEach((updatedNode) => {
      const parent = updatedNode.parentNode

      if (parent) parent.normalize()
    })
  }

  getSelectedTextNodes = () => {
    const selection = Editor.getSelection()

    if (selection.isCollapsed || !selection.rangeCount) {
      return { selectedTextNodes: [] }
    }

    const range = Editor.getRange()
    const node1 = selection.anchorNode
    const node2 = selection.focusNode
    const selectionAncestor = range.commonAncestorContainer

    if (selectionAncestor == null) {
      return { selectedTextNodes: [] }
    }

    const selectedNodes = getNodesBetween(selectionAncestor, node1, node2)
    const {
      correctedSelectedNodes,
      shouldCorrectSelectionStart,
      shouldCorrectSelectionEnd,
    } = this.correctSelectedNodes({ selectedNodes, range })
    const selectedTextNodes = this.getSelectedTextNodesFrom({
      correctedSelectedNodes,
      selection,
    })

    if (shouldCorrectSelectionStart || shouldCorrectSelectionEnd) {
      this.correctSelection({
        shouldCorrectSelectionStart,
        shouldCorrectSelectionEnd,
        range,
        selectedTextNodes,
      })
    }

    console.log("original selectedNodes: ", selectedNodes)

    return selectedTextNodes
  }

  // Filters out selected nodes that don't have any selected chars - happens when
  // empty nodes or nodes selected before very beginning of node or after the very end of node
  correctSelectedNodes = ({ selectedNodes, range }) => {
    let shouldCorrectSelectionStart = false
    let shouldCorrectSelectionEnd = false

    const correctedSelectedNodes = selectedNodes.filter(
      (selectedNode, index) => {
        if (index === 0) {
          const result = range.startOffset < selectedNode.textContent.length

          if (!result) {
            console.log("update start")
            shouldCorrectSelectionStart = true
          }

          return result
        }

        if (index === selectedNodes.length - 1) {
          const result = range.endOffset > 0

          if (!result) {
            console.log("update end")
            shouldCorrectSelectionEnd = true
          }

          return result
        }

        return true
      }
    )

    return {
      correctedSelectedNodes,
      shouldCorrectSelectionStart,
      shouldCorrectSelectionEnd,
    }
  }

  correctSelection = ({
    shouldCorrectSelectionStart,
    shouldCorrectSelectionEnd,
    selectedTextNodes,
    range,
  }) => {
    if (shouldCorrectSelectionStart && shouldCorrectSelectionEnd) {
      Editor.selectRange({
        startNode: selectedTextNodes[0],
        endNode: selectedTextNodes[selectedTextNodes.length - 1],
        endOffset:
          selectedTextNodes[selectedTextNodes.length - 1].textContent.length,
      })
    } else if (shouldCorrectSelectionStart) {
      Editor.selectRange({
        startNode: selectedTextNodes[0],
        endNode: range.endContainer,
        endOffset: range.endOffset,
      })
    } else if (shouldCorrectSelectionEnd) {
      Editor.selectRange({
        startNode: range.startContainer,
        startOffset: range.startOffset,
        endNode: selectedTextNodes[selectedTextNodes.length - 1],
        endOffset:
          selectedTextNodes[selectedTextNodes.length - 1].textContent.length,
      })
    }
  }

  getSelectedTextNodesFrom = ({ correctedSelectedNodes, selection }) => {
    return correctedSelectedNodes.reduce((acc, selectedNode) => {
      // Have to filter text nodes to handle case when selectedNode contains multiple textNodes and not all of them are selected
      acc.push(
        ...getTextNodes(selectedNode).filter((textNode) =>
          selection.containsNode(textNode)
        )
      )
      return acc
    }, [])
  }

  createStyleNode = (tagName) => {
    if (tagName !== "h1" && tagName !== "h2") {
      return document.createElement(tagName)
    }

    const styleNode = document.createElement("span")
    this.addStylesForHeading(styleNode, tagName)

    return styleNode
  }

  addStylesForHeading = (node, tagName) => {
    node.style.fontWeight = "bold"

    if (tagName === "h1") {
      node.style.fontSize = `${Editor.DEFAULT_FONT_SIZE * 2}px`
    } else if (tagName === "h2") {
      node.style.fontSize = `${Editor.DEFAULT_FONT_SIZE * 1.5}px`
    }
  }
}
