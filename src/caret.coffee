class @Caret

    cssAttributes = [
        'overflowY', 'overflowX',                                           # Overflows
        'height', 'width', 'maxHeight', 'minHeight', 'maxWidth', 'minWidth' # Sizing
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',       # Padding
        'marginTop', 'marginRight', 'marginLeft', 'marginBottom',           # Margin
        'fontFamily', 'fontSize'                                            # Font
        'borderStyle', 'borderWidth', 'outline',                            # Border
        'wordWrap', 'lineHeight', 'text-align'                              # Text
    ]

    htmlEscapes =
        '&': '&amp;'
        '<': '&lt;'
        '>': '&gt;'
        '"': '&quot;'
        "'": '&#39;'

    escapeHtmlChar = (chr) ->
        htmlEscapes[chr]

    lastPosition = 0
    utils =

        sanitize: (text) ->
            pre = document.createElement 'pre'
            pre[if pre.textContent? then 'textContent' else 'innerText'] = text
            return pre.innerHTML

        process: (text) ->
            text.replace(/[&<>"']/g, escapeHtmlChar)
                .replace(/(\r\n|\r|\n)/g, '<br/>')

        getRangePosition: (textRange, docRange, endPoint) ->
            range = textRange.duplicate()
            range.setEndPoint endPoint, docRange
            return range.text.length

        getStyle: (element) ->
            return element.currentStyle or document.defaultView.getComputedStyle(element, "")

        cloneStyle: (element) ->
            css =
                visibility: 'hidden'
                position:   'absolute'
                left: 0
                top:  0
                'pointer-events': 'none'
                'white-space': 'pre-wrap'
            
            elementStyle = @getStyle(element)

            for attribute in cssAttributes
                css[attribute] = elementStyle[attribute]

            return css

        clone: (element, updateScroll) ->
            
            # Find the clone for the given element
            name = '_clone'
            clone = document.getElementById(name)

            # Unless the clone already exists, make a new one
            unless clone?
                clone = document.createElement 'div'
                clone.id = name
                element.parentNode.appendChild clone

                cloneStyle = @cloneStyle(element)
                for key, value of cloneStyle
                    clone.style[key] = value
                
            # Always update the style and positioning
            if updateScroll
                clone.scrollLeft = element.scrollLeft
                clone.scrollTop  = element.scrollTop

            return clone

    getCaretPosition = (element) ->

        position = { start: -1, end: -1 }

        if document.selection
            
            docRange  = document.selection.createRange()
            textRange = document.body.createTextRange()
            textRange.moveToElementText element
            
            position.start = utils.getRangePosition(textRange, docRange, 'EndToStart')
            position.end   = utils.getRangePosition(textRange, docRange, 'EndToEnd')
                    
        else if element.selectionStart or element.selectionStart is '0'
            
            position.start = element.selectionStart
            position.end   = element.selectionEnd

        return position

    # Get element absolute position
    getElementPosition = (element) ->
        
        # Get scroll amount.
        html = document.documentElement
        body = document.body
        scrollLeft = (body.scrollLeft or html.scrollLeft)
        scrollTop  = (body.scrollTop  or html.scrollTop)
        
        rect   = element.getBoundingClientRect()

        left   = rect.left   - html.clientLeft + scrollLeft
        top    = rect.top    - html.clientTop  + scrollTop
        right  = rect.right  - html.clientLeft + scrollLeft
        bottom = rect.bottom - html.clientTop  + scrollTop

        position =
            top:    parseInt(top)
            right:  parseInt(right)
            bottom: parseInt(bottom)
            left:   parseInt(left)

    constructor: (@element, @sanitize = utils.sanitize) ->

    position: (mode, debugging = false) ->

        elementPosition = getElementPosition(@element)
        clone = utils.clone @element, (mode is 'absolute')

        string = @element.value
        position = getCaretPosition(@element)

        text =
            left:     string.slice(0,              position.start)
            selected: string.slice(position.start, position.end) or '|'
            right:    string.slice(position.end,   string.length)

        for key, value of text
            text[key] = @sanitize value

        # Set text for the clone.
        innerHTML =  "#{utils.process(text.left)}"
        innerHTML += "<wbr><span>#{utils.process(text.selected)}</span><wbr>"
        innerHTML += "#{utils.process(text.right)}"

        clone.innerHTML = innerHTML

        clonePosition = getElementPosition clone
        caretPosition = getElementPosition clone.getElementsByTagName('span')[0]

        if mode is 'relative'
            # Returns pixel position relative to top left of the given textarea
            position =
                left: caretPosition.left - clonePosition.left
                top:  caretPosition.top  - clonePosition.top

            @element.parentNode.removeChild clone if debugging

            return position

        if mode is 'absolute'
            # Returns pixel position relative to top left of the document
            position =
                left: position.left + caretPosition.left - clonePosition.left
                top:  position.top  + caretPosition.top  - clonePosition.top

            @element.parentNode.removeChild clone if debugging

            return position

        throw 'Mode selection required.'

    getCursorPosition: ->
        lastPosition = @element.selectionEnd
        lastPosition

    setCursorPosition: (position) ->
        @element.setSelectionRange position, position

    getCurrentWordParts: (position) ->
        text = @element.val()
        cursor = position or @getCursorPosition()

        return {
            before: space.before.exec text.slice 0, cursor
            after:  space.after.exec text.slice cursor
        }

    getCurrentWord: ->
        {before, after} = @getCurrentWordParts()

        result = ''
        result += if before?.length then before?[0] else ''
        result += if after?.length then after?[0] else ''

    getCurrentWordIndices: (position) ->
        cursor = position or @getCursorPosition()

        {before, after} = @getCurrentWordParts(cursor)

        return {
            start: cursor - if before?.length then before[0].length else 0
            end: cursor + if after?.length then after[0].length else 0
        }

    updateCurrentWord: ->
        @currentWord = @getCurrentWord()

    setText: (text) ->
        @element.val text

    split = (text, start, end) ->
        return {
            before: text.substr 0, start
            after: text.substr end
        }

    replaceCurrentWord: (text) ->
        currentText = @element.val()
        indices = @getCurrentWordIndices lastPosition

        {before, after} = split currentText, indices.start, indices.end

        @setText before + text + after

        newCursor = before.length + text.length
        @setCursorPosition newCursor

        @updateCurrentWord()
