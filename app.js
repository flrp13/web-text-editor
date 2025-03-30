import {settings} from "./settings.js";

const SCALE_FACTOR = 1.4
const LINE_START_X = settings.fontSize * SCALE_FACTOR

const canvas = document.getElementById('editor')
const ctx = canvas.getContext("2d");
const body = document.body

let textStrRepr = '\tHello world\n I\'m Mike'
let text // editor text lines
let currTextLineIdx = 0 // current selected text line
let currCursorIdx = 0
let charWidth

const cursorPos = [LINE_START_X, 0] // x, y

let keyCombination = ''

let showCursor = true
let lastBlinkTime = Date.now()

// params involved in text highlighting
const initialClickPos = [0, 0]
const highlightParams = [0, 0, 0, 0] // x, y, width, height
let isHighlight = false


function init() {
    canvas.height = body.offsetHeight
    canvas.width = body.offsetWidth
    parseTextStrRepr()
    window.requestAnimationFrame(draw);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Canvas
    ctx.fillStyle = settings.editorBgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.save()

    // Line numbers
    ctx.font = `${settings.fontSize}px Space Mono`
    ctx.fillStyle = 'grey'
    for (let i = 0; i < text.length; i++) {
        ctx.fillText(i + 1, 20, settings.fontSize * (i + 1))
    }

    if (isHighlight) {
        ctx.fillRect(...highlightParams)
    }

    // Text lines
    ctx.fillStyle = settings.fontColor
    for (const [i, line] of text.entries()) {
        ctx.fillText(line, LINE_START_X, settings.fontSize * (i + 1))
        charWidth = ctx.measureText('a').width
    }

    // Blinking cursor
    const now = Date.now()
    if (now - lastBlinkTime > 500) {
        lastBlinkTime = now
        showCursor = showCursor ? false : true
    }

    if (showCursor) {
        ctx.fillRect(...cursorPos, 5, settings.fontSize)
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



function parseTextStrRepr() {

    if (textStrRepr) {
        let newStrRepr = textStrRepr.replaceAll('\t', ' '.repeat(settings.tabSize))

        text = newStrRepr.split('\n')
    } else {
        text = ['']
    }
}

function convertToTextStrRepr() {
    textStrRepr = text.join('\n')
    if (!settings.useSpacesForTabs) {
        textStrRepr = textStrRepr.replaceAll(' '.repeat(settings.tabSize), '\t')
    }
    console.log(JSON.stringify(textStrRepr))
}


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
    cursorPos[0] = LINE_START_X + charWidth * currCursorIdx
    cursorPos[1] = settings.fontSize * currTextLineIdx
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

    if (x < LINE_START_X) {
        currCursorIdx = 0
    } else {
        let calcCursorIdx = Math.round((x - LINE_START_X) / charWidth)
        if (calcCursorIdx > text[currTextLineIdx].length) {
            currCursorIdx = text[currTextLineIdx].length
        } else {
            currCursorIdx = calcCursorIdx
        }
    }

    updateCursorPos()
}

function highlightSelection() {
    highlightParams[0] = initialClickPos[0]
    highlightParams[1] = initialClickPos[1]
    highlightParams[2] = cursorPos[0] - initialClickPos[0]
    highlightParams[3] = settings.fontSize
    // console.log('x: ', highlightParams[0], 'y: ', highlightParams[1], 'width: ', highlightParams[2],'height: ', highlightParams[3])
    console.log('x: ', cursorPos[0], ' y: ', cursorPos[1])
}

let leftClickPressed = false

window.addEventListener('mousemove', (e) => {
    let {clientX: x, clientY: y} = e;

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
    let {clientX: x, clientY: y} = e;
    leftClickPressed = e.button == 0

    // handle the case where text is highlighted
    // and second click should cancel highlight
    if (isHighlight) {
        isHighlight = false
    }
    if (leftClickPressed) {
        // this is basically a normal click
        // so place cursor correctly
        positionCursor(x, y)

        // save initial click position to serve as 
        // potential text selection starting point
        initialClickPos[0] = cursorPos[0]
        initialClickPos[1] = cursorPos[1]
    }
})

window.addEventListener('mouseup', (e) => {
    let {clientX: x, clientY: y} = e;

    if (leftClickPressed) {
        leftClickPressed = false
    }
})

// Scale canvas on resize
window.addEventListener('resize', () => {
    canvas.height = body.offsetHeight
    canvas.width = body.offsetWidth
})




init()