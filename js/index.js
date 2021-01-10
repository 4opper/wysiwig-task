import { Caret } from './Caret'
import { Editor } from './Editor'

init()

function init() {
  window.addEventListener('DOMContentLoaded', () => {
    const testNode = document.querySelector('#test')
    const editorNode = document.querySelector('.edit-area')
    const caret = new Caret(editorNode)
    const editor = new Editor(caret, editorNode)

    // const handlePosChanged = caret.createHandlePosChanged(editor)

    document.querySelector('.head-1').addEventListener('click', () => {
      editor.handleH1Click()
      updateTextNode(testNode, editorNode)
    })
    document.querySelector('.head-2').addEventListener('click', () => {
      editor.handleH2Click()
      updateTextNode(testNode, editorNode)
    })
    document.querySelector('.bold').addEventListener('click', () => {
      editor.handleBoldClick()
      updateTextNode(testNode, editorNode)
    })
    document.querySelector('.italic').addEventListener('click', () => {
      editor.handleItalicClick()
      updateTextNode(testNode, editorNode)
    })
    editorNode.addEventListener('input', () => {
      updateTextNode(testNode, editorNode)
    })

    // editorNode.addEventListener('click', handlePosChanged)
    // document.addEventListener('keydown', handlePosChanged)
  })
}

function updateTextNode (testNode, editorNode) {
  testNode.innerText = ''
  Array.from(editorNode.childNodes).forEach(childNode => {
    testNode.innerText += `${childNode.outerHTML || childNode.data}\n`
  })
}