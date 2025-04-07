const canvas = document.getElementById('editor')
const ctx = canvas.getContext("2d");
canvas.height = document.body.offsetHeight
canvas.width = document.body.offsetWidth
let userSettings

window.addEventListener('DOMContentLoaded', async () => {
    userSettings = await (await fetch('./settings.json')).json()
    ctx.font = `${userSettings.fontSize}px ${userSettings.fontFamily}`
    window.requestAnimationFrame(draw);
})

const editorConfig = {
    ...textMeasure(ctx.font)
}
const buffer = createTextBuffer('Hi everyone Im mike\nHappy to be here')
const cursor = createCursor()

// Path2D path names
const ICON_FILE_PATH = 'iconFilePath'

canvas.style.cursor = 'text'

let text = ['']// editor text lines
let currTextLineIdx = 0 // current text line we're on
let currCursorIdx = 0
let charWidth
let lineNumW
let lineNumMaxTextW

let keyCombination = ''

let showCursor = true
let lastBlinkTime = Date.now()

// params involved in text highlighting
const initialClickPos = [0, 0]
const highlightParams = { x: 0, y: 0, w: 0, h: 0 }
let isHighlight = false

const fileIcon = new Image()
fileIcon.src = 'file.svg'

let isSeparatorHovered = false


// this allows to use images in conjuction with isPointInPath
ctx.paths = {}
ctx.customDrawImage = function (image, name, x, y) {
    this.drawImage(image, x, y)
    this.paths[name] = new Path2D()
    this.paths[name].rect(x, y, image.width, image.height)
}

function draw() {
    let cw = canvas.width
    let ch = canvas.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // TOP BAR
    ctx.fillStyle = userSettings.sidebarColor
    ctx.fillRect(0, 0, cw, 40)
    ctx.translate(0, 40)
    ch -= 40

    // SIDE BAR
    ctx.fillStyle = userSettings.sidebarColor
    ctx.fillRect(0, 0, 300, ch)

    ctx.customDrawImage(fileIcon, ICON_FILE_PATH, 0, 0)

    ctx.translate(300, 0)
    cw -= 300

    // SEPARATOR
    ctx.fillStyle = 'green'
    ctx.fillRect(0, 0, 3, ch)
    ctx.translate(3, 0)
    cw -= 3

    // EDITOR
    ctx.fillStyle = userSettings.editorBgColor
    ctx.fillRect(0, 0, cw, ch)
    ctx.translate(3, 3) // some padding inside editor
    cw -= 3
    ch -= 3


    // Line numbers
    ctx.fillStyle = 'grey'

    lineNumMaxTextW = ctx.measureText(text.length.toString()).width
    lineNumW = lineNumMaxTextW * 1.2
    for (let i = 1; i <= buffer.length; i++) {
        let currentTextW = ctx.measureText(i).width
        ctx.fillText(i, lineNumW - currentTextW, editorConfig.editorTextHeight * i)
    }
    let marginRight = 5
    ctx.translate(lineNumW + marginRight, 0)
    cw -= lineNumW + marginRight

    if (isHighlight) {
        ctx.fillRect(0, 0, 0, 0)
    }

    // Text lines
    drawText(ctx, buffer, editorConfig)

    // Blinking cursor
    drawBlinkingCursor(ctx, cursor, editorConfig)

    window.requestAnimationFrame(draw)
}

// Keyboard events ---------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
    e.preventDefault() // block browser key combination events

    // ensure that cursor is shown when typing
    showCursor = true
    lastBlinkTime = Date.now()

    switch (e.key) {
        case 'Shift':
            break
        case 'Control':
            if (!keyCombination.includes(e.key)) {
                keyCombination += e.key
            }
            break
        case 'ArrowLeft':
            currCursorIdx--
            if (currCursorIdx < 0) {
                if (currTextLineIdx != 0) {
                    // jump to the end of the above line
                    currCursorIdx = text[--currTextLineIdx].length
                } else {
                    currCursorIdx = 0
                }
            }
            break
        case 'ArrowRight':
            currCursorIdx++
            if (currCursorIdx > text[currTextLineIdx].length) {
                if (currTextLineIdx != text.length - 1) {
                    // jump to the beginning of the above line
                    currTextLineIdx++
                    currCursorIdx = 0
                } else {
                    currCursorIdx = text[currTextLineIdx].length
                }
            }
            break
        case 'ArrowUp':
            currTextLineIdx--
            if (currTextLineIdx < 0) {
                currTextLineIdx = 0
                currCursorIdx = 0
            } else if (currCursorIdx > text[currTextLineIdx].length) {
                currCursorIdx = text[currTextLineIdx].length
            }
            break
        case 'ArrowDown':
            currTextLineIdx++
            if (currTextLineIdx > text.length - 1) {
                currTextLineIdx = text.length - 1
                currCursorIdx = text[currTextLineIdx].length
            } else if (currCursorIdx > text[currTextLineIdx].length) {
                currCursorIdx = text[currTextLineIdx].length
            }
            break
        case 'Enter':
            let textToMoveLower = text[currTextLineIdx].slice(currCursorIdx)
            text[currTextLineIdx] = text[currTextLineIdx].substring(0, currCursorIdx)
            text.splice(++currTextLineIdx, 0, textToMoveLower)
            currCursorIdx = 0
            break
        case 'Backspace':
            let s = text[currTextLineIdx]
            text[currTextLineIdx] = s.slice(0, Math.max(currCursorIdx - 1, 0) /* for currCursorIdx == 0 case */)
                + s.slice(currCursorIdx)
            currCursorIdx--

            if (currCursorIdx < 0) {
                // if on first line, you can't go further up
                if (currTextLineIdx != 0) {
                    let leftoverStr = text[currTextLineIdx] // this can be empty or have values
                    // remove line and go to next one up
                    text.splice(currTextLineIdx, 1)
                    currTextLineIdx--
                    currCursorIdx = text[currTextLineIdx].length

                    if (leftoverStr) {
                        // combine leftover text with above line
                        text[currTextLineIdx] = text[currTextLineIdx] + leftoverStr
                    }
                } else {
                    // reset cursor index
                    currCursorIdx = 0
                }
            }
            break
        default:
            if (keyCombination) {
                if (!keyCombination.includes(`[${e.key}]`)) {
                    keyCombination += `[${e.key}]`
                }
            } else {
                let s = text[currTextLineIdx]

                let incrementCursorIdxAmount = 1
                let toInsert = e.key
                if (toInsert == 'Tab') {
                    toInsert = ' '.repeat(userSettings.tabSize)
                    incrementCursorIdxAmount = userSettings.tabSize
                }
                if (currCursorIdx != text[currTextLineIdx].length) {
                    // we "insert" chars at cursor pos
                    text[currTextLineIdx] = s.slice(0, currCursorIdx) + toInsert + s.slice(currCursorIdx)
                } else {
                    // otherwise just append key
                    text[currTextLineIdx] += toInsert
                }
                currCursorIdx += incrementCursorIdxAmount
            }

    }
    updateCursorPos()
})

window.addEventListener('keyup', (e) => {
    // A key combination means that keys are pressed (and stay pressed)
    // in succession, until an action is triggered when usually last key pressed
    // is released

    if (keyCombination) {
        tryProcessKeyCombination(keyCombination)
    }
    keyCombination = ''
})

// Helper func for key combinations (Ctrl+S -> Save)
function tryProcessKeyCombination(str) {
    switch (str) {
        case 'Control[s]':
            convertToTextStrRepr()
            break
    }
}

function highlightSelection() {
    highlightParams.x = initialClickPos[0]
    highlightParams.y = initialClickPos[1]
    highlightParams.w = blinkingCursorParams[0] - initialClickPos[0]
    highlightParams.h = userSettings.fontSize
}

let leftClickPressed = false

window.addEventListener('mousemove', (e) => {
    let { clientX: x, clientY: y } = e;

    if (leftClickPressed && initialClickPos[0] != x) {

        if (!isHighlight) {
            isHighlight = true
        }
        positionCursor(x, y)
        highlightSelection()
    }

})

window.addEventListener('mousedown', (e) => {
    let { clientX: x, clientY: y } = e;
    leftClickPressed = e.button == 0

    // handle the case where text is highlighted
    // and second click should cancel highlight
    if (isHighlight) {
        isHighlight = false
        highlightParams = { x: 0, y: 0, w: 0, h: 0 }
    }
    if (leftClickPressed) {
        // this is basically a normal click
        // so place cursor correctly
        positionCursor(x, y)

        // save initial click position to serve as 
        // potential text selection starting point
        initialClickPos[0] = blinkingCursorParams[0]
        initialClickPos[1] = blinkingCursorParams[1]
    }
})

window.addEventListener('mouseup', (e) => {
    let { clientX: x, clientY: y } = e;

    if (leftClickPressed) {
        leftClickPressed = false
    }
})

// Scale canvas on resize
window.addEventListener('resize', () => {
    canvas.height = document.body.offsetHeight
    canvas.width = document.body.offsetWidth
})

// CURSOR ##################################################################
function createCursor(initialLine = 0, initialColumn = 0) {
    return {
        line: initialLine,
        column: initialColumn,
        isVisible: true,
        lastBlinkTime: Date.now(),
    }
}

function moveCursorLeft(cursor, buffer) {
    if (cursor.column > 0) {
        cursor.column--
    } else if (cursor.line > 0) {
        cursor.line--
        cursor.column = buffer[cursor.line].length
    }
}

function moveCursorRight(cursor, buffer) {
    if (cursor.column < buffer[cursor.line].length) {
        cursor.column++
    } else if (cursor.line < buffer.length - 1) {
        cursor.line++
        cursor.column = 0
    }
}

function updateCursorBlink(cursor) {
    let now = Date.now()
    if (now - cursor.lastBlinkTime > 500) {
        cursor.lastBlinkTime = now
        cursor.isVisible = !cursor.isVisible
    }
}

function moveCursorToPosition(cursor, line, column) {
    cursor.line = line
    cursor.column = column
}

function convertCoordsToCursorPos(buffer, x, y) {

}
function getCursorCoords(cursor, charWidth, textHeight) {
    const x = cursor.column * charWidth
    const y = cursor.line * textHeight
    return {
        cursorX: x,
        cursorY: y
    }

}


function updateCursorPos() {
    blinkingCursorParams.x = LINE_START_TEXT + charWidth * currCursorIdx - cursorSize[0] / 2
    blinkingCursorParams.y = userSettings.fontSize * currTextLineIdx + (cursorHeight - userSettings.fontSize) / 2
}

function positionCursor(x, y) {
    // if clicked too high up the page
    if (y < userSettings.fontSize) {
        // focus first line
        currTextLineIdx = 0
    } else {
        // focus correct text line depending on fontSize
        // these are indexes so we subtract 1 every time
        let calcLineIdx = Math.round(y / userSettings.fontSize) - 1
        // make sure calculated line idx is within existing line indexes
        if (calcLineIdx > text.length - 1) {
            // if clicked too low in the page (lower than last line with text)
            // focus last line of text
            currTextLineIdx = text.length - 1
        } else {
            currTextLineIdx = calcLineIdx
        }
    }

    if (x < LINE_START_TEXT) {
        currCursorIdx = 0
    } else {
        let calcCursorIdx = Math.round((x - LINE_START_TEXT) / charWidth)
        if (calcCursorIdx > text[currTextLineIdx].length) {
            currCursorIdx = text[currTextLineIdx].length
        } else {
            currCursorIdx = calcCursorIdx
        }
    }

    updateCursorPos()
}

function drawBlinkingCursor(ctx, cursor, editorConfig) {

    // line: initialLine,
    // column: initialColumn,
    // isVisible: true,
    // lastBlinkTime: Date.now(),
    let { cursorX, cursorY } = getCursorCoords(cursor, editorConfig.editorCharWidth, editorConfig.editorTextHeight)
    updateCursorBlink(cursor)
    if (cursor.isVisible) {
        ctx.fillRect(cursorX, cursorY, 2, editorConfig.editorTextHeight)
        ctx.fillStyle = userSettings.fontColor
    }
}

// TEXT BUFFER ##############################################################

function createTextBuffer(initialText = '') {
    return initialText ? initialText.split('\n') : ['']

}

function insertTextAt(buffer, lineIndex, charIndex, text) {
    if (lineIndex < 0 || lineIndex >= buffer.length)
        throw new Error(`Line Index Out of Bounds, received: ${lineIndex}`)

    let s = buffer[lineIndex]
    if (charIndex < 0 || charIndex > s.length)
        throw new Error(`Char Index Out of Bounds, received: ${charIndex}`)


    if (text.includes('\n')) {

        const insLines = text.split('\n')
        const sBeforeIns = s.substring(0, charIndex)
        const sAfterIns = s.substring(charIndex)
        buffer[lineIndex] = sBeforeIns + insLines[0]
        insLines[insLines.length - 1] = insLines[insLines.length - 1] + sAfterIns
        buffer.splice(lineIndex + 1, 0, ...insLines.slice(1))
    } else {
        buffer[lineIndex] = s.substring(0, charIndex) + text + s.substring(charIndex)
    }
}

function deleteTextAt(buffer, lineIndex, charIndex, length) {
    if (lineIndex < 0 || lineIndex >= buffer.length)
        throw new Error(`Line Index Out of Bounds, received: ${lineIndex}`)

    if (charIndex < 0 || charIndex > buffer[lineIndex].length)
        throw new Error(`Char Index Out of Bounds, received: ${charIndex}`)

    let currLineIndex = lineIndex
    let currCharIndex = charIndex
    let l = length
    if (l < 0) {
        l = Math.abs(l)
        while (1) {
            if (currCharIndex - l < 0) {
                l -= currCharIndex
                currLineIndex--
                currCharIndex = buffer[currLineIndex].length
                continue
            }
            currCharIndex = currCharIndex - l
            l = Math.abs(length)
            break
        }
    }

    while (l) {
        // get current line string/substring length
        let currStrLen = buffer[currLineIndex].substring(currCharIndex).length

        if (currCharIndex == 0 && l >= currStrLen) {
            buffer.splice(currLineIndex, 1) // just remove the line from arr

            // currLineIndex stays the same since we removed entry from buffer arr
            // so indexes after removed line shifted left
            l -= currStrLen
            currCharIndex = 0

            continue
        }

        let sBeforeDel = buffer[currLineIndex].substring(0, currCharIndex)
        // use 2 substr since first creates a new 0 index starting str
        // and second removes correct num of chars
        // .substring(length) works with length > str.length
        let sAfterDel = buffer[currLineIndex].substring(currCharIndex).substring(l)
        buffer[currLineIndex] = sBeforeDel + sAfterDel

        if (l > currStrLen) {
            l -= currStrLen
            currLineIndex++
            currCharIndex = 0
        } else {
            break
        }
    }
}
function splitTextLineAt(buffer, lineIndex, charIndex) {
    if (lineIndex < 0 || lineIndex >= buffer.length)
        throw new Error(`Line Index Out of Bounds, received: ${lineIndex}`)

    if (charIndex < 0 || charIndex > buffer[lineIndex].length)
        throw new Error(`Char Index Out of Bounds, received: ${charIndex}`)

    let sBeforeSplit = buffer[lineIndex].substring(0, charIndex)
    let sAfterSplit = buffer[lineIndex].substring(charIndex)
    buffer[lineIndex] = sBeforeSplit
    // move leftover string to next line (++lineIndex)
    ++lineIndex >= buffer.length ?
        buffer.push(sAfterSplit) :
        buffer.splice(lineIndex, 0, sAfterSplit)
}

function textMeasure(fontStr, lineSpacing = 1) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = fontStr
    const { width, fontBoundingBoxAscent, fontBoundingBoxDescent } = ctx.measureText('M')
    const fullHeight = (fontBoundingBoxAscent + fontBoundingBoxDescent) * lineSpacing
    const heightAboveBaseline = fontBoundingBoxAscent * lineSpacing
    const heightBelowBaseline = fontBoundingBoxDescent * lineSpacing

    return {
        editorCharWidth: width,
        editorTextHeight: fullHeight,
        editorTextBaseline: {
            fromTop: fontBoundingBoxAscent,
            heightAbove: heightAboveBaseline,
            heightBelow: heightBelowBaseline
        }
    }
}

function drawText(ctx, buffer, editorConfig) {
    ctx.fillStyle = userSettings.fontColor
    for (const [i, line] of buffer.entries()) {
        ctx.fillText(line, 0, editorConfig.editorTextHeight * (i + 1))
        charWidth = ctx.measureText('a').width
    }
}