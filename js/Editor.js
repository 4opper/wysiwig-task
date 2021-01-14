import {
  createTextNode,
  getNodeParentsUntil,
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
      if (this.isDev) console.log("no range")

      return
    }

    const { startOffset, endOffset, collapsed } = range

    if (!selectedTextNodes.length) {
      if (this.isDev) console.log("no selected text")

      return
    }

    const updatedSelectedNodes = []
    const isSelectionAlreadyWrapped = selectedTextNodes.every((textNode) =>
      this.getParentNodeWithTag({
        node: textNode,
        tagName,
        rootNode: this.editorNode,
      })
    )
    let updatedStartOffset = undefined
    let updatedEndOffset = undefined

    selectedTextNodes.forEach((selectedTextNode, selectedNodeIndex) => {
      if (!isSelectionAlreadyWrapped) {
        const isAlreadyWrapped = Boolean(
          this.getParentNodeWithTag({
            node: selectedTextNode,
            tagName,
            rootNode: this.editorNode,
          })
        )

        if (isAlreadyWrapped) {
          if (this.isDev) console.log("whole node is already wrapped")

          if (selectedNodeIndex === 0) {
            updatedStartOffset = startOffset
          }

          if (selectedNodeIndex === selectedTextNodes.length - 1) {
            updatedEndOffset = endOffset
          }

          updatedSelectedNodes.push(selectedTextNode)

          return
        }
      }

      if (selectedTextNodes.length === 1) {
        this.handleSingleTextNodeSelected({
          isSelectionAlreadyWrapped,
          range,
          selectedTextNode,
          updatedSelectedNodes,
          tagName,
        })
      } else {
        this.handleMultipleTextNodesSelected({
          isSelectionAlreadyWrapped,
          range,
          selectedTextNode,
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
    selectedTextNode,
    range,
    tagName,
  }) => {
    const styleNode = this.getParentNodeWithTag({
      node: selectedTextNode,
      tagName,
      rootNode: this.editorNode,
    })
    const replaceWithNodes = []
    const selectedText = range.toString()

    if (isSelectionAlreadyWrapped) {
      if (this.isDev) console.log("unstyle: single text node")

      const textBeforeSelected = selectedTextNode.data.slice(
        0,
        range.startOffset
      )
      const textAfterSelected = selectedTextNode.data.slice(
        range.endOffset,
        selectedTextNode.length
      )
      const parents = getNodeParentsUntil(selectedTextNode, styleNode)
      const parentsTags = Array.from(parents).map(
        (parent) => parent.dataset.tag || parent.tagName
      )
      const parentsWithoutStyleNode = parents.filter(
        (parent) => parent !== styleNode
      )
      const parentsWithoutStyleNodeTags = Array.from(
        parentsWithoutStyleNode
      ).map((parent) => parent.dataset.tag || parent.tagName)

      if (textBeforeSelected) {
        const textNodeWithBeforeSelectedText = createTextNode(textBeforeSelected)
        const nodeWithBeforeSelectedText =
          parents.length > 0
            ? parentsTags.reduce((acc, parentTagName) => {
              const parentNode = this.createStyleNode(parentTagName)
              parentNode.append(acc)
              acc = parentNode
              return acc
            }, textNodeWithBeforeSelectedText)
            : textNodeWithBeforeSelectedText

        replaceWithNodes.push(nodeWithBeforeSelectedText)
      }


      const textNodeWithSelectedText = createTextNode(selectedText)
      const nodeWithSelectedText =
        parentsWithoutStyleNode.length > 0
          ? parentsWithoutStyleNodeTags.reduce((acc, parentTagName) => {
            const parentNode = this.createStyleNode(parentTagName)
            parentNode.append(acc)
            acc = parentNode
            return acc
          }, textNodeWithSelectedText)
          : textNodeWithSelectedText

      replaceWithNodes.push(nodeWithSelectedText)

      if (textAfterSelected) {
        const textNodeWithAfterSelectedText = createTextNode(textAfterSelected)
        const nodeWithAfterSelectedText =
          parents.length > 0
            ? parentsTags.reduce((acc, parentTagName) => {
              const parentNode = this.createStyleNode(parentTagName)
              parentNode.append(acc)
              acc = parentNode
              return acc
            }, textNodeWithAfterSelectedText)
            : textNodeWithAfterSelectedText

        replaceWithNodes.push(nodeWithAfterSelectedText)
      }


      updatedSelectedNodes.push(textNodeWithSelectedText)
      styleNode.replaceWith(...replaceWithNodes)
    } else {
      if (this.isDev) console.log("single text node")

      const textBeforeSelected = selectedTextNode.data.slice(
        0,
        range.startOffset
      )
      const textAfterSelected = selectedTextNode.data.slice(
        range.endOffset,
        selectedTextNode.length
      )
      const wrapperNode = this.createStyleNode(tagName)

      if (textBeforeSelected) replaceWithNodes.push(textBeforeSelected)
      if (selectedText) replaceWithNodes.push(wrapperNode)
      if (textAfterSelected) replaceWithNodes.push(textAfterSelected)

      wrapperNode.append(selectedText)
      selectedTextNode.replaceWith(...replaceWithNodes)
      updatedSelectedNodes.push(wrapperNode.firstChild)
    }
  }

  handleMultipleTextNodesSelected = ({
    isSelectionAlreadyWrapped,
    updatedSelectedNodes,
    selectedTextNode,
    range,
    tagName,
    selectedTextNodes,
  }) => {
    const { startOffset, endOffset, endContainer } = range
    const selection = getSelection()
    const isFirstNode = selectedTextNode === selectedTextNodes[0]
    const isLastNode =
      selectedTextNode === selectedTextNodes[selectedTextNodes.length - 1]
    const isFullySelected =
      (isFirstNode && startOffset === 0) ||
      (isLastNode && endOffset === endContainer.length) ||
      (!isFirstNode && !isLastNode)

    if (isSelectionAlreadyWrapped) {
      const styleNode = this.getParentNodeWithTag({
        node: selectedTextNode,
        tagName,
        rootNode: this.editorNode,
      })

      // As we use childNodes in some iteration after the first one it's possible that styleNode is already replaced
      if (styleNode) {
        if (isFullySelected) {
          if (this.isDev)
            console.log("unstyle: one of multiple nodes is fully selected")

          updatedSelectedNodes.push(
            ...Array.from(styleNode.childNodes).filter(childNode => selection.containsNode(childNode)).flatMap((childNode) =>
              getTextNodes(childNode)
            )
          )
          styleNode.replaceWith(...styleNode.childNodes)
        } else {
          const parents = getNodeParentsUntil(selectedTextNode, styleNode)
          const parentsTags = Array.from(parents).map(
            (parent) => parent.dataset.tag || parent.tagName
          )
          const parentsWithoutStyleNode = parents.filter(
            (parent) => parent !== styleNode
          )
          const parentsWithoutStyleNodeTags = Array.from(
            parentsWithoutStyleNode
          ).map((parent) => parent.dataset.tag || parent.tagName)

          if (isFirstNode) {
            if (this.isDev)
              console.log(
                "unstyle: first of multiple nodes is not fully selected"
              )

            const notSelectedText = selectedTextNode.data.slice(0, startOffset)
            const selectedText = selectedTextNode.data.slice(
              startOffset,
              selectedTextNode.length
            )
            const textNodeWithSelectedText = createTextNode(selectedText)
            const nodeWithSelectedText =
              parentsWithoutStyleNode.length > 0
                ? parentsWithoutStyleNodeTags.reduce((acc, parentTagName) => {
                    const parentNode = this.createStyleNode(parentTagName)
                    parentNode.append(acc)
                    acc = parentNode
                    return acc
                  }, textNodeWithSelectedText)
                : textNodeWithSelectedText
            const nodeWithNotSelectedText =
              parents.length > 0
                ? parentsTags.reduce((acc, parentTagName) => {
                    const parentNode = this.createStyleNode(parentTagName)
                    parentNode.append(acc)
                    acc = parentNode
                    return acc
                  }, createTextNode(notSelectedText))
                : createTextNode(notSelectedText)

            styleNode.replaceWith(nodeWithNotSelectedText, nodeWithSelectedText)
            updatedSelectedNodes.push(textNodeWithSelectedText)
          }

          if (isLastNode) {
            if (this.isDev)
              console.log(
                "unstyle: last of multiple nodes is not fully selected"
              )

            const selectedText = selectedTextNode.data.slice(0, endOffset)
            const notSelectedText = selectedTextNode.data.slice(
              endOffset,
              selectedTextNode.length
            )
            const textNodeWithSelectedText = createTextNode(selectedText)
            const nodeWithSelectedText =
              parentsWithoutStyleNode.length > 0
                ? parentsWithoutStyleNodeTags.reduce((acc, parentTagName) => {
                    const parentNode = this.createStyleNode(parentTagName)
                    parentNode.append(acc)
                    acc = parentNode
                    return acc
                  }, textNodeWithSelectedText)
                : textNodeWithSelectedText
            const nodeWithNotSelectedText =
              parents.length > 0
                ? parentsTags.reduce((acc, parentTagName) => {
                    const parentNode = this.createStyleNode(parentTagName)
                    parentNode.append(acc)
                    acc = parentNode
                    return acc
                  }, createTextNode(notSelectedText))
                : createTextNode(notSelectedText)

            styleNode.replaceWith(nodeWithSelectedText, nodeWithNotSelectedText)
            updatedSelectedNodes.push(textNodeWithSelectedText)
          }
        }
      }
    } else {
      if (isFullySelected) {
        if (this.isDev) console.log("one of multiple nodes is fully selected")

        const wrapperNode = this.createStyleNode(tagName)
        const clonedNode = selectedTextNode.cloneNode()

        wrapperNode.append(clonedNode)
        selectedTextNode.replaceWith(wrapperNode)
        updatedSelectedNodes.push(wrapperNode.firstChild)
      } else {
        if (isFirstNode) {
          if (this.isDev)
            console.log("first of multiple nodes is not fully selected")

          const notSelectedText = selectedTextNode.data.slice(0, startOffset)
          const selectedText = selectedTextNode.data.slice(
            startOffset,
            selectedTextNode.length
          )
          const wrapperNode = this.createStyleNode(tagName)

          wrapperNode.append(selectedText)
          selectedTextNode.replaceWith(notSelectedText, wrapperNode)
          updatedSelectedNodes.push(wrapperNode.firstChild)
        }

        if (isLastNode) {
          if (this.isDev)
            console.log("last of multiple nodes is not fully selected")

          const selectedText = selectedTextNode.data.slice(0, endOffset)
          const notSelectedText = selectedTextNode.data.slice(
            endOffset,
            selectedTextNode.length
          )
          const wrapperNode = this.createStyleNode(tagName)

          wrapperNode.append(selectedText)
          selectedTextNode.replaceWith(wrapperNode, notSelectedText)
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
      startContainer: startNode,
      startOffset: updatedStartOffset,
      endContainer: endNode,
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
      return []
    }

    const range = getRange()
    const node1 = selection.anchorNode
    const node2 = selection.focusNode
    const selectionAncestor = range.commonAncestorContainer

    if (selectionAncestor == null) {
      return []
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
        startContainer: selectedTextNodes[0],
        endNode: selectedTextNodes[selectedTextNodes.length - 1],
        endOffset:
          selectedTextNodes[selectedTextNodes.length - 1].textContent.length,
      })
    } else if (shouldCorrectSelectionStart) {
      selectRange({
        startContainer: selectedTextNodes[0],
        endContainer: range.endContainer,
        endOffset: range.endOffset,
      })
    } else if (shouldCorrectSelectionEnd) {
      selectRange({
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: selectedTextNodes[selectedTextNodes.length - 1],
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

  getParentNodeWithTag = ({ node, tagName, rootNode }) => {
    return getParentNodeWithTag({
      node,
      tagName: tagName === "H1" || tagName === "H2" ? "SPAN" : tagName,
      rootNode,
      additionalChecks: [
        (parentNode) => {
          if (tagName === "H1" || tagName === "H2") {
            return parentNode.dataset.tag === tagName
          }

          return true
        },
      ],
    })
  }

  createStyleNode = (tagName) => {
    if (tagName !== "H1" && tagName !== "H2") {
      return document.createElement(tagName)
    }

    const styleNode = document.createElement("SPAN")
    styleNode.setAttribute("data-tag", tagName)

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
