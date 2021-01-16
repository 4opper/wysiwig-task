import { Editor } from "./Editor"
import { getRootFontSize } from "./domUtils"

init()

function init() {
  window.addEventListener("DOMContentLoaded", () => {
    const editorNode = document.querySelector(".edit-area")
    const editor = new Editor({
      editorNode,
      rootFontSize: getRootFontSize(),
      isDev: false,
    })

    editor.init()
  })
}
