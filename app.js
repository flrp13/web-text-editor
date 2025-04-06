import { settings } from "./settings.js";

const canvas = document.getElementById('editor')
const ctx = canvas.getContext("2d");
canvas.height = document.body.offsetHeight
canvas.width = document.body.offsetWidth
ctx.font = `${settings.fontSize}px ${settings.fontFamily}`


// Path2D path names
const ICON_FILE_PATH = 'iconFilePath'


let SCALE_FACTOR = 1.2
let LINE_START_TEXT = settings.fontSize * SCALE_FACTOR

canvas.style.cursor = 'text'

let text = ['']// editor text lines
let currTextLineIdx = 0 // current text line we're on
let currCursorIdx = 0
let charWidth
let lineNumW
let lineNumMaxTextW

const blinkingCursorParams = { x: 0, y: 0, w: 3, h: settings.fontSize * SCALE_FACTOR }

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

window.addEventListener('DOMContentLoaded', () => {
    window.requestAnimationFrame(draw);
})

function draw() {
    let cw = canvas.width
    let ch = canvas.height
    let charW = ctx.measureText('a').width

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // TOP BAR
    ctx.fillStyle = settings.sidebarColor
    ctx.fillRect(0, 0, cw, 40)
    ctx.translate(0, 40)
    ch -= 40

    // SIDE BAR
    ctx.fillStyle = settings.sidebarColor
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
    ctx.fillStyle = settings.editorBgColor
    ctx.fillRect(0, 0, cw, ch)
    ctx.translate(3, 3) // some padding inside editor
    cw -= 3
    ch -= 3


    // Line numbers
    ctx.fillStyle = 'grey'
    let marginRight = 5
    lineNumMaxTextW = ctx.measureText(text.length).width
    lineNumW = lineNumMaxTextW * 1.2
    for (let i = 1; i <= text.length; i++) {
        let currentTextW = ctx.measureText(i).width
        ctx.fillText(i, lineNumW - currentTextW, settings.fontSize * i)
    }
    ctx.translate(lineNumW + marginRight, 0)
    cw -= lineNumW + marginRight

    if (isHighlight) {
        ctx.fillRect(0, 0, 0, 0)
    }

    // Text lines
    ctx.fillStyle = settings.fontColor
    for (const [i, line] of text.entries()) {
        ctx.fillText(line, 0, settings.fontSize * (i + 1))
        charWidth = ctx.measureText('a').width
    }

    // Blinking cursor
    const now = Date.now()
    if (now - lastBlinkTime > 500) {
        lastBlinkTime = now
        showCursor = showCursor ? false : true
    }

    if (showCursor) {
        ctx.fillRect(...Object.values(blinkingCursorParams))
        ctx.fillStyle = settings.fontColor
    }

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
                    toInsert = ' '.repeat(settings.tabSize)
                    incrementCursorIdxAmount = settings.tabSize
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


function updateCursorPos() {
    blinkingCursorParams.x = LINE_START_TEXT + charWidth * currCursorIdx - cursorSize[0] / 2
    blinkingCursorParams.y = settings.fontSize * currTextLineIdx + (cursorHeight - settings.fontSize) / 2
}

function positionCursor(x, y) {
    // if clicked too high up the page
    if (y < settings.fontSize) {
        // focus first line
        currTextLineIdx = 0
    } else {
        // focus correct text line depending on fontSize
        // these are indexes so we subtract 1 every time
        let calcLineIdx = Math.round(y / settings.fontSize) - 1
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

function highlightSelection() {
    highlightParams.x = initialClickPos[0]
    highlightParams.y = initialClickPos[1]
    highlightParams.w = blinkingCursorParams[0] - initialClickPos[0]
    highlightParams.h = settings.fontSize
    // console.log('x: ', highlightParams[0], 'y: ', highlightParams[1], 'width: ', highlightParams[2],'height: ', highlightParams[3])
    console.log('x: ', blinkingCursorParams[0], ' y: ', blinkingCursorParams[1])
}

let leftClickPressed = false

window.addEventListener('mousemove', (e) => {
    let { clientX: x, clientY: y } = e;

    if (leftClickPressed && initialClickPos[0] != x) {

        console.log(true)
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