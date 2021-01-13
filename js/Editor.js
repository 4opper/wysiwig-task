// TODO fix removing headings
// TODO test very well
// TODO test in different browsers
import {
  createTextNode,
  getNodesBetween,
  getParentNodeWithTag,
  getTextNodes,
} from "./domUtils"
import { getRange, getSelection, selectRange } from "./selectionUtils"

export class Editor {
  constructor({ editorNode, isDev = false, defaultFontSize = 16 }) {
    this.editorNode = editorNode
    this.isDev = isDev
    this.defaultFontSize = defaultFontSize
  }

  init = () => {
    const testNode = document.querySelector(".js-debug")

    document.querySelector(".js-toolkit").addEventListener("click", (e) => {
      if (e.target !== e.currentTarget) {
        const buttonNode =
          e.target.tagName === "BUTTON" ? e.target : e.target.parentNode
        const wrapperTagName = buttonNode.dataset.tag

        this.handleActionClick(wrapperTagName)

        if (this.isDev) {
          testNode.innerText = ""
          Array.from(this.editorNode.childNodes).forEach((childNode) => {
            testNode.innerText += `${childNode.outerHTML || childNode.data}\n`
          })
        }
      }
    })

    if (this.isDev) {
      this.editorNode.addEventListener("input", () => {
        testNode.innerText = ""
        Array.from(this.editorNode.childNodes).forEach((childNode) => {
          testNode.innerText += `${childNode.outerHTML || childNode.data}\n`
        })
      })
    }
  }

  handleActionClick = (tagName) => {
    const selectedTextNodes = this.getSelectedTextNodes()
    const range = getRange()

    if (!range) {
      return
    }

    const { endOffset, collapsed } = range
    const updatedSelectedNodes = []
    const isSelectionAlreadyWrapped = selectedTextNodes.every((textNode) =>
      getParentNodeWithTag({
        node: textNode,
        tagName,
        rootNode: this.editorNode,
      })
    )
    let updatedStartOffset = undefined
    let updatedEndOffset = undefined

    selectedTextNodes.forEach((newSelectedTextNode, selectedNodeIndex) => {
      if (!isSelectionAlreadyWrapped) {
        const isAlreadyWrapped = Boolean(
          getParentNodeWithTag({
            node: newSelectedTextNode,
            tagName,
            rootNode: this.editorNode,
          })
        )

        if (isAlreadyWrapped) {
          if (this.isDev) console.log("whole node is already wrapped")

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
      this.updateSelection({
        updatedSelectedNodes,
        updatedStartOffset,
        updatedEndOffset,
      })
    }

    // Normalize on removing styles
    if (updatedSelectedNodes.length && isSelectionAlreadyWrapped) {
      this.normalizeSelectedNodes(updatedSelectedNodes)
    }
  }

  handleSingleTextNodeSelected = ({
    isSelectionAlreadyWrapped,
    updatedSelectedNodes,
    newSelectedTextNode,
    range,
    tagName,
  }) => {
    if (this.isDev) console.log("single text node")

    const styleNode = getParentNodeWithTag({
      node: newSelectedTextNode,
      tagName,
      rootNode: this.editorNode,
    })
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
        const textNodeWithoutStyle = createTextNode(selectedText)
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

  handleMultipleTextNodesSelected = ({
    isSelectionAlreadyWrapped,
    updatedSelectedNodes,
    newSelectedTextNode,
    range,
    tagName,
    selectedTextNodes,
  }) => {
    const { startOffset, endOffset, endContainer } = range
    const isFirstNode = newSelectedTextNode === selectedTextNodes[0]
    const isLastNode =
      newSelectedTextNode === selectedTextNodes[selectedTextNodes.length - 1]

    if (
      (isFirstNode && startOffset === 0) ||
      (isLastNode && endOffset === endContainer.length) ||
      (!isFirstNode && !isLastNode)
    ) {
      if (this.isDev) console.log("one of multiple nodes is fully selected")

      if (isSelectionAlreadyWrapped) {
        const styleNode = getParentNodeWithTag({
          node: newSelectedTextNode,
          tagName,
          rootNode: this.editorNode,
        })

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
        if (this.isDev)
          console.log("first of multiple nodes is not fully selected")

        const notSelectedText = newSelectedTextNode.data.slice(0, startOffset)
        const selectedText = newSelectedTextNode.data.slice(
          startOffset,
          newSelectedTextNode.length
        )

        if (isSelectionAlreadyWrapped) {
          const styleNode = getParentNodeWithTag({
            node: newSelectedTextNode,
            tagName,
            rootNode: this.editorNode,
          })
          const textNodeWithoutStyle = createTextNode(selectedText)
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
        if (this.isDev)
          console.log("last of multiple nodes is not fully selected")

        const selectedText = newSelectedTextNode.data.slice(0, endOffset)
        const notSelectedText = newSelectedTextNode.data.slice(
          endOffset,
          newSelectedTextNode.length
        )

        if (isSelectionAlreadyWrapped) {
          const styleNode = getParentNodeWithTag({
            node: newSelectedTextNode,
            tagName,
            rootNode: this.editorNode,
          })
          const textNodeWithoutStyle = createTextNode(selectedText)
          const tagNode = this.createStyleNode(tagName)

          tagNode.append(notSelectedText)
          styleNode.replaceWith(textNodeWithoutStyle, tagNode)
          updatedSelectedNodes.push(textNodeWithoutStyle)
        } else {
          const wrapperNode = this.createStyleNode(tagName)

          wrapperNode.append(selectedText)
          newSelectedTextNode.replaceWith(wrapperNode, notSelectedText)
          updatedSelectedNodes.push(wrapperNode.firstChild)
        }
      }
    }
  }

  updateSelection = ({
    updatedSelectedNodes,
    updatedStartOffset,
    updatedEndOffset,
  }) => {
    const startNode = updatedSelectedNodes[0]
    const endNode = updatedSelectedNodes[updatedSelectedNodes.length - 1]

    if (this.isDev) console.log("updatedSelectedNodes: ", updatedSelectedNodes)

    selectRange({
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
    const selection = getSelection()

    if (selection.isCollapsed || !selection.rangeCount) {
      return { selectedTextNodes: [] }
    }

    const range = getRange()
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

    if (this.isDev) console.log("original selectedNodes: ", selectedNodes)

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
            if (this.isDev) console.log("update start")

            shouldCorrectSelectionStart = true
          }

          return result
        }

        if (index === selectedNodes.length - 1) {
          const result = range.endOffset > 0

          if (!result) {
            if (this.isDev) console.log("update end")

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

  // Correct selection after odd nodes were filtered out
  correctSelection = ({
    shouldCorrectSelectionStart,
    shouldCorrectSelectionEnd,
    selectedTextNodes,
    range,
  }) => {
    if (shouldCorrectSelectionStart && shouldCorrectSelectionEnd) {
      selectRange({
        startNode: selectedTextNodes[0],
        endNode: selectedTextNodes[selectedTextNodes.length - 1],
        endOffset:
          selectedTextNodes[selectedTextNodes.length - 1].textContent.length,
      })
    } else if (shouldCorrectSelectionStart) {
      selectRange({
        startNode: selectedTextNodes[0],
        endNode: range.endContainer,
        endOffset: range.endOffset,
      })
    } else if (shouldCorrectSelectionEnd) {
      selectRange({
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
    if (tagName !== "H1" && tagName !== "H2") {
      return document.createElement(tagName)
    }

    const styleNode = document.createElement("span")
    this.addStylesForHeading(styleNode, tagName)

    return styleNode
  }

  addStylesForHeading = (node, tagName) => {
    node.style.fontWeight = "bold"

    if (tagName === "H1") {
      node.style.fontSize = `${this.defaultFontSize * 2}px`
    } else if (tagName === "H2") {
      node.style.fontSize = `${this.defaultFontSize * 1.5}px`
    }
  }
}
