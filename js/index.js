import { Caret } from './Caret'
import { Editor } from './Editor'

init()

function init() {
  window.addEventListener('DOMContentLoaded', () => {
    const editorNode = document.querySelector('.edit-area')
    const caret = new Caret(editorNode)
    const editor = new Editor(caret)

    const handlePosChanged = caret.createHandlePosChanged(editor)

    // document.querySelector('.head-1').addEventListener('click', editor.handleHeadingClick)
    // document.querySelector('.head-2').addEventListener('click', editor.handleSubheadingClick)
    // document.querySelector('.bold').addEventListener('click', editor.handleBoldClick)
    document.querySelector('.italic').addEventListener('click', editor.handleItalicClick)
    editorNode.addEventListener('click', handlePosChanged)
    document.addEventListener('keydown', handlePosChanged)
  })
}