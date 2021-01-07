import { Caret } from './js/Caret'
import { Editor } from './js/Editor'

init()

function init() {
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
}