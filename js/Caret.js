export class Caret {
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
