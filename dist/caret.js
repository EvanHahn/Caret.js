(function() {
  this.Caret = (function() {
    var cssAttributes, escapeHtmlChar, getCaretPosition, getElementPosition, htmlEscapes, lastPosition, split, utils;

    cssAttributes = ['overflowY', 'overflowX', 'height', 'width', 'maxHeight', 'minHeight', 'maxWidth', 'minWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginLeft', 'marginBottom', 'fontFamily', 'fontSize', 'borderStyle', 'borderWidth', 'outline', 'wordWrap', 'lineHeight', 'text-align'];

    htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    escapeHtmlChar = function(chr) {
      return htmlEscapes[chr];
    };

    lastPosition = 0;

    utils = {
      sanitize: function(text) {
        var pre;
        pre = document.createElement('pre');
        pre[pre.textContent != null ? 'textContent' : 'innerText'] = text;
        return pre.innerHTML;
      },
      process: function(text) {
        return text.replace(/[&<>"']/g, escapeHtmlChar).replace(/(\r\n|\r|\n)/g, '<br/>');
      },
      getRangePosition: function(textRange, docRange, endPoint) {
        var range;
        range = textRange.duplicate();
        range.setEndPoint(endPoint, docRange);
        return range.text.length;
      },
      getStyle: function(element) {
        return element.currentStyle || document.defaultView.getComputedStyle(element, "");
      },
      cloneStyle: function(element) {
        var attribute, css, elementStyle, _i, _len;
        css = {
          visibility: 'hidden',
          position: 'absolute',
          left: 0,
          top: 0,
          'pointer-events': 'none',
          'white-space': 'pre-wrap'
        };
        elementStyle = this.getStyle(element);
        for (_i = 0, _len = cssAttributes.length; _i < _len; _i++) {
          attribute = cssAttributes[_i];
          css[attribute] = elementStyle[attribute];
        }
        return css;
      },
      clone: function(element, updateScroll) {
        var clone, cloneStyle, key, name, value;
        name = '_clone';
        clone = document.getElementById(name);
        if (clone == null) {
          clone = document.createElement('div');
          clone.id = name;
          element.parentNode.appendChild(clone);
          cloneStyle = this.cloneStyle(element);
          for (key in cloneStyle) {
            value = cloneStyle[key];
            clone.style[key] = value;
          }
        }
        if (updateScroll) {
          clone.scrollLeft = element.scrollLeft;
          clone.scrollTop = element.scrollTop;
        }
        return clone;
      }
    };

    getCaretPosition = function(element) {
      var docRange, position, textRange;
      position = {
        start: -1,
        end: -1
      };
      if (document.selection) {
        docRange = document.selection.createRange();
        textRange = document.body.createTextRange();
        textRange.moveToElementText(element);
        position.start = utils.getRangePosition(textRange, docRange, 'EndToStart');
        position.end = utils.getRangePosition(textRange, docRange, 'EndToEnd');
      } else if (element.selectionStart || element.selectionStart === '0') {
        position.start = element.selectionStart;
        position.end = element.selectionEnd;
      }
      return position;
    };

    getElementPosition = function(element) {
      var body, bottom, html, left, position, rect, right, scrollLeft, scrollTop, top;
      html = document.documentElement;
      body = document.body;
      scrollLeft = body.scrollLeft || html.scrollLeft;
      scrollTop = body.scrollTop || html.scrollTop;
      rect = element.getBoundingClientRect();
      left = rect.left - html.clientLeft + scrollLeft;
      top = rect.top - html.clientTop + scrollTop;
      right = rect.right - html.clientLeft + scrollLeft;
      bottom = rect.bottom - html.clientTop + scrollTop;
      return position = {
        top: parseInt(top),
        right: parseInt(right),
        bottom: parseInt(bottom),
        left: parseInt(left)
      };
    };

    function Caret(element, sanitize) {
      this.element = element;
      this.sanitize = sanitize != null ? sanitize : utils.sanitize;
    }

    Caret.prototype.position = function(mode, debugging) {
      var caretPosition, clone, clonePosition, elementPosition, innerHTML, key, position, string, text, value;
      if (debugging == null) {
        debugging = false;
      }
      elementPosition = getElementPosition(this.element);
      clone = utils.clone(this.element, mode === 'absolute');
      string = this.element.value;
      position = getCaretPosition(this.element);
      text = {
        left: string.slice(0, position.start),
        selected: string.slice(position.start, position.end) || '|',
        right: string.slice(position.end, string.length)
      };
      for (key in text) {
        value = text[key];
        text[key] = this.sanitize(value);
      }
      innerHTML = "" + (utils.process(text.left));
      innerHTML += "<wbr><span>" + (utils.process(text.selected)) + "</span><wbr>";
      innerHTML += "" + (utils.process(text.right));
      clone.innerHTML = innerHTML;
      clonePosition = getElementPosition(clone);
      caretPosition = getElementPosition(clone.getElementsByTagName('span')[0]);
      if (mode === 'relative') {
        position = {
          left: caretPosition.left - clonePosition.left,
          top: caretPosition.top - clonePosition.top
        };
        if (debugging) {
          this.element.parentNode.removeChild(clone);
        }
        return position;
      }
      if (mode === 'absolute') {
        position = {
          left: position.left + caretPosition.left - clonePosition.left,
          top: position.top + caretPosition.top - clonePosition.top
        };
        if (debugging) {
          this.element.parentNode.removeChild(clone);
        }
        return position;
      }
      throw 'Mode selection required.';
    };

    Caret.prototype.getCursorPosition = function() {
      lastPosition = this.element.selectionEnd;
      return lastPosition;
    };

    Caret.prototype.setCursorPosition = function(position) {
      return this.element.setSelectionRange(position, position);
    };

    Caret.prototype.getCurrentWordParts = function(position) {
      var cursor, text;
      text = this.element.val();
      cursor = position || this.getCursorPosition();
      return {
        before: space.before.exec(text.slice(0, cursor)),
        after: space.after.exec(text.slice(cursor))
      };
    };

    Caret.prototype.getCurrentWord = function() {
      var after, before, result, _ref;
      _ref = this.getCurrentWordParts(), before = _ref.before, after = _ref.after;
      result = '';
      result += (before != null ? before.length : void 0) ? before != null ? before[0] : void 0 : '';
      return result += (after != null ? after.length : void 0) ? after != null ? after[0] : void 0 : '';
    };

    Caret.prototype.getCurrentWordIndices = function(position) {
      var after, before, cursor, _ref;
      cursor = position || this.getCursorPosition();
      _ref = this.getCurrentWordParts(cursor), before = _ref.before, after = _ref.after;
      return {
        start: cursor - ((before != null ? before.length : void 0) ? before[0].length : 0),
        end: cursor + ((after != null ? after.length : void 0) ? after[0].length : 0)
      };
    };

    Caret.prototype.updateCurrentWord = function() {
      return this.currentWord = this.getCurrentWord();
    };

    Caret.prototype.setText = function(text) {
      return this.element.val(text);
    };

    split = function(text, start, end) {
      return {
        before: text.substr(0, start),
        after: text.substr(end)
      };
    };

    Caret.prototype.replaceCurrentWord = function(text) {
      var after, before, currentText, indices, newCursor, _ref;
      currentText = this.element.val();
      indices = this.getCurrentWordIndices(lastPosition);
      _ref = split(currentText, indices.start, indices.end), before = _ref.before, after = _ref.after;
      this.setText(before + text + after);
      newCursor = before.length + text.length;
      this.setCursorPosition(newCursor);
      return this.updateCurrentWord();
    };

    return Caret;

  })();

}).call(this);
