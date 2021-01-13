import { Editor } from "./Editor"

init()

function init() {
  window.addEventListener("DOMContentLoaded", () => {
    const editorNode = document.querySelector(".edit-area")
    const editor = new Editor(editorNode, true)

    editor.init()
  })
}
