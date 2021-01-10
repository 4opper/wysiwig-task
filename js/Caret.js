export class Caret {
  selectWordAtCaret = () => {
    const selection = document.getSelection();

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
}
