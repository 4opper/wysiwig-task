export class Caret {
  constructor (target) {
    this.target = target
    this.isContentEditable = target && target.contentEditable
  }

  getPos = () => {
    if (this.isContentEditable) {
      this.target.focus()
      let position = 0;
      const selection = window.getSelection();

      if (selection.rangeCount !== 0) {
        const range = window.getSelection().getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(this.target);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        position = preCaretRange.toString().length;
      }

      return position;
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

  selectWordAtCaret = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount < 1) return true;

    const range = selection.getRangeAt(0);
    const node = selection.anchorNode;
    const word_regexp = /^\w*$/;

    // Extend the range backward until it matches word beginning
    while ((range.startOffset > 0) && range.toString().match(word_regexp)) {
      range.setStart(node, (range.startOffset - 1));
    }
    // // Restore the valid word match after overshooting
    if (!range.toString().match(word_regexp)) {
      range.setStart(node, range.startOffset + 1);
    }

    // Extend the range forward until it matches word ending
    while ((range.endOffset < node.length) && range.toString().match(word_regexp)) {
      range.setEnd(node, range.endOffset + 1);
    }
    // Restore the valid word match after overshooting
    if (!range.toString().match(word_regexp)) {
      range.setEnd(node, range.endOffset - 1);
    }

    return { range };
  }


  createHandlePosChanged = (editor) => () => {
    this.target.focus()
    let _range = document.getSelection().getRangeAt(0)
    let range = _range.cloneRange()
    range.selectNodeContents(this.target)
    range.setEnd(_range.endContainer, _range.endOffset)

    const parentNode = range.endContainer.parentNode

    editor.clearActiveButtons()

    if (parentNode.tagName === 'I') {
      editor.setIsItalicIconActive(true)
    }
  }
}
