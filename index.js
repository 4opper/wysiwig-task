class Caret {
  constructor (target, editor) {
    this.target = target
    this.isContentEditable = target && target.contentEditable
    this.editor = editor
  }

  getPos = () => {
    if (this.isContentEditable) {
      this.target.focus()
      let _range = document.getSelection().getRangeAt(0)
      let range = _range.cloneRange()
      range.selectNodeContents(this.target)
      range.setEnd(_range.endContainer, _range.endOffset)

      console.log('range: ', range)

      return range.toString().length
    }
    return this.target.selectionStart
  }

  setPos = (pos) => {
    if (this.isContentEditable) {
      this.target.focus()
      document.getSelection().collapse(this.target, pos)
      return
    }
    this.target.setSelectionRange(pos, pos)
  }

  handlePosChanged = (event) => {
    console.log('event: ', event)
    // console.log("this.getPos(): ", this.getPos())

    this.target.focus()
    let _range = document.getSelection().getRangeAt(0)
    let range = _range.cloneRange()
    range.selectNodeContents(this.target)
    range.setEnd(_range.endContainer, _range.endOffset)

    const parentNode = range.endContainer.parentNode

    this.editor.clearActiveButtons()

    if (parentNode.tagName === 'I') {
      this.editor.setIsItalicIconActive(true)
    }
  }
}

class Editor {
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
    this.isItalicActive = isActive

    const icon = document.querySelector('.italic')

    if (isActive) {
      icon.style.opacity = '100%'
    } else {
      icon.style.opacity = '60%'
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
      // debugger
      
      // if (range.startOffset === 0 && range.endOffset === 0) {
        selectedDOMNodes.push(currentNodeElement.firstChild || currentNodeElement)
        shouldIterate = (currentNodeElement.firstChild || currentNodeElement) !== range.endContainer
        currentNodeElement = currentNodeElement.nextSibling  
      // }
    }

    return { selectedDOMNodes, range }
  }

  handleItalicClick = () => {
    this.setIsItalicIconActive(!this.isItalicActive)
    const { selectedDOMNodes, range } = this.getSelectedNodes()

    // TODO Should update only part of string - seems can use insertNode/surroundContents
    // TODO apply for the full word if nothing is selected
    // TODO make it work for already styled text (nested text)
    const updatedSelectedNodes = []
    selectedDOMNodes.forEach(node => {
      if (node.nodeValue) {
        if (selectedDOMNodes.length === 1) {
          // console.log("startOffset, endOffset: ", startOffset, endOffset)

          if (range.startOffset !== 0 && range.endOffset !== 0) {
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

    Editor.selectRange(updatedSelectedNodes[0], updatedSelectedNodes[updatedSelectedNodes.length - 1])
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const editorNode = document.querySelector('.edit-area')
  const editor = new Editor()

  const caret = new Caret(editorNode, editor)

  document.querySelector('.head-1').addEventListener('click', editor.handleHeadingClick)
  document.querySelector('.head-2').addEventListener('click', editor.handleSubheadingClick)
  document.querySelector('.bold').addEventListener('click', editor.handleBoldClick)
  document.querySelector('.italic').addEventListener('click', editor.handleItalicClick)
  editorNode.addEventListener('click', caret.handlePosChanged)
  document.addEventListener('keydown', caret.handlePosChanged)
})