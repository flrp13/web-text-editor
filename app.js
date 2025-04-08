const layout = {
    topBar: {
        height: 60,  // Height in pixels
        color: '#3498db'
    },
    sideBar: {
        width: 250,  // Width in pixels
        color: 'green'
    },
    editor: {
        color: 'black'
    }
};

const topCanvas = document.getElementById('topBar')
const sideCanvas = document.getElementById('leftPanel')
const editorCanvas = document.getElementById('editor')

const topCtx = topCanvas.getContext('2d')
const sideCtx = sideCanvas.getContext('2d')
const editorCtx = editorCanvas.getContext('2d')

let topDimensions
let sideDimensions
let editorDimensions
let userSettings
let editorConfig
let lineNumW
let lineNumMaxTextW
let keyCombination = ''

const buffer = createTextBuffer('Hi everyone Im mike\nHappy to be here')
const cursor = createCursor()
const pointer = createPointer()

function updateLayout() {
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Top bar (full width, fixed height)
    positionCanvas(topCanvas, 0, 0, windowWidth, layout.topBar.height)
    topDimensions = resizeCanvas(topCanvas, windowWidth, layout.topBar.height)

    // Side bar (fixed width, height below top bar)
    positionCanvas(sideCanvas, 0, layout.topBar.height, layout.sideBar.width, windowHeight - layout.topBar.height)
    sideDimensions = resizeCanvas(sideCanvas, layout.sideBar.width, windowHeight - layout.topBar.height)

    // Editor (remaining space)
    positionCanvas(editorCanvas, layout.sideBar.width, layout.topBar.height, windowWidth - layout.sideBar.width, windowHeight - layout.topBar.height)
    editorDimensions = resizeCanvas(editorCanvas, windowWidth - layout.sideBar.width, windowHeight - layout.topBar.height)
}


function draw() {
    clearCanvas(topCtx, topDimensions.width, topDimensions.height)
    drawRect(topCtx, 0, 0, topDimensions.width, topDimensions.height, layout.topBar.color)

    drawEditor(editorCtx, buffer, cursor, editorConfig, editorDimensions)
    requestAnimationFrame(draw)
}

function drawEditor(ctx, buffer, cursor, editorConfig, editorDimensions) {
    clearCanvas(ctx, editorDimensions.width, editorDimensions.height)
    drawRect(ctx, 0, 0, editorDimensions.width, editorDimensions.height, layout.editor.color)

    // Text lines
    drawText(ctx, buffer, editorConfig)

    // Blinking cursor
    drawBlinkingCursor(ctx, cursor, editorConfig)

    // Things that should reset after each frame
    pointerClick(pointer, false)
}

// Keyboard events ---------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
    e.preventDefault() // block browser key combination events

    switch (e.key) {
        case 'Shift':
            break
        case 'Control':
            if (!keyCombination.includes(e.key)) {
                keyCombination += e.key
            }
            break
        case 'ArrowLeft':
            moveCursor(cursor, buffer, c.LEFT)
            break
        case 'ArrowRight':
            moveCursor(cursor, buffer, c.RIGHT)
            break
        case 'ArrowUp':
            moveCursor(cursor, buffer, c.UP)
            break
        case 'ArrowDown':
            moveCursor(cursor, buffer, c.DOWN)
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


// POINTER #################################################################
function createPointer() {
    return {
        x: 0,
        y: 0,
        click: false,
        pressed: false,
    }
}
function updatePointerPos(pointer, x, y) {
    pointer.x = x
    pointer.y = y
}

function pointerClick(pointer, bool) {
    pointer.click = bool
}

function pointerPressed(pointer, bool) {
    pointer.pressed = bool
}

document.body.addEventListener('pointerdown', function (e) {
    pointerClick(pointer, true)
    pointerPressed(pointer, true)
})
document.body.addEventListener('pointerup', function (e) {
    pointerPressed(pointer, false)

})
document.body.addEventListener('pointermove', function (e) {
    updatePointerPos(pointer, e.offsetX, e.offsetY)
})

// CURSOR ##################################################################
const c = {
    LEFT: 'left',
    RIGHT: 'right',
    UP: 'up',
    DOWN: 'down'
}

function createCursor(initialLine = 0, initialColumn = 0) {
    return {
        line: initialLine,
        column: initialColumn,
        isVisible: true,
        isBlinkingActive: true,
        lastBlinkTime: Date.now(),
    }
}
function moveCursor(cursor, buffer, direction) {
    resetCursorBlink(cursor)
    switch (direction) {
        case c.LEFT:
            if (cursor.column > 0) {
                cursor.column--
            } else if (cursor.line > 0) {
                cursor.line--
                cursor.column = buffer[cursor.line].length
            }
            break
        case c.RIGHT:
            if (cursor.column < buffer[cursor.line].length) {
                cursor.column++
            } else if (cursor.line < buffer.length - 1) {
                cursor.line++
                cursor.column = 0
            }
            break
        case c.UP:
            if (cursor.line > 0) {
                cursor.line--
                if (cursor.column > buffer[cursor.line].length) {
                    cursor.column = buffer[cursor.line].length
                }
            } else if (cursor.column > 0) {
                cursor.column = 0
            }
            break
        case c.DOWN:
            if (cursor.line < buffer.length - 1) {
                cursor.line++
                if (cursor.column > buffer[cursor.line].length) {
                    cursor.column = buffer[cursor.line].length
                }
            } else if (cursor.column < buffer[cursor.line].length) {
                cursor.column = buffer[cursor.line].length
            }
            break
    }
}

function updateCursorBlink(cursor) {
    if (!cursor.isBlinkingActive) return

    let now = Date.now()
    if (now - cursor.lastBlinkTime > 500) {
        cursor.lastBlinkTime = now
        cursor.isVisible = !cursor.isVisible
    }
}

function resetCursorBlink(cursor) {
    cursor.lastBlinkTime = Date.now()
    cursor.isVisible = true
}

function moveCursorToPosition(cursor, line, column) {
    cursor.line = line
    cursor.column = column
}


function getCursorCoords(cursor, charWidth, textHeight) {
    const x = cursor.column * charWidth
    const y = cursor.line * textHeight
    return {
        cursorX: x,
        cursorY: y
    }

}

function convertCoordsToCursorPos(cursor, buffer, x, y, charWidth, textHeight) {
    // if clicked too high up the page
    if (y < textHeight) {
        // focus first line
        cursor.line = 0
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

}

function drawBlinkingCursor(ctx, cursor, editorConfig) {
    let { cursorX, cursorY } = getCursorCoords(cursor, editorConfig.editorCharWidth, editorConfig.editorTextHeight)
    updateCursorBlink(cursor)
    if (cursor.isVisible) {
        ctx.fillRect(cursorX, cursorY + editorConfig.editorTextBaseline.heightBelow, 2, editorConfig.editorTextHeight)
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
    }
}

function drawRect(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function clearCanvas(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
}

// Position and resize canvas with CSS
function positionCanvas(canvas, left, top, width, height) {
    canvas.style.left = `${left}px`
    canvas.style.top = `${top}px`
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
}

// Resize canvas (handling high DPI screens)
function resizeCanvas(canvas, width, height) {
    // Set actual size in memory (scaled for high DPI screens)
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    // Scale the context
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    return { width, height }
}

window.addEventListener('resize', (e) => {
    updateLayout()
    editorCtx.font = `${userSettings.fontSize}px ${userSettings.fontFamily}`
})

window.addEventListener('DOMContentLoaded', async () => {
    updateLayout()

    userSettings = await (await fetch('./settings.json')).json()
    editorCtx.font = `${userSettings.fontSize}px ${userSettings.fontFamily}`
    editorCanvas.style.cursor = 'text'
    editorConfig = {
        ...textMeasure(editorCtx.font)
    }

    requestAnimationFrame(draw);
})
