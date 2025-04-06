function createTextBuffer(initialText = '') {
    const lines = initialText ? initialText.split('\n') : ['']

    return {
        getLine: index => index >= 0 && index < lines.length ? lines[index] : null,
        getLines: (start, end) => lines.slice(start, end),
        getAllLines: () => [...lines],
        getLineCount: () => lines.length,
        insertAt: (lineIndex, charIndex, text) => {
            if (lineIndex < 0 || lineIndex >= lines.length)
                throw new Error(`Line Index Out of Bounds, received: ${lineIndex}`)

            let s = lines[lineIndex]
            if (charIndex < 0 || charIndex >= s.length)
                throw new Error(`Char Index Out of Bounds, received: ${charIndex}`)


            if (text.contains('\n')) {

                const insLines = text.split('\n')
                const sBeforeIns = s.substring(0, charIndex)
                const sAfterIns = s.substring(charIndex)
                lines[lineIndex] = sBeforeIns + insLines[0]
                insLines[insLines.length - 1] = insLines[insLines.length - 1] + sAfterIns
                lines.splice(lineIndex + 1, 0, ...insLines.slice(1))
            } else {
                lines[lineIndex] = s.substring(0, charIndex) + text + s.substring(charIndex)
            }
        },
        deleteAt: (lineIndex, charIndex, length) => {
            if (lineIndex < 0 || lineIndex >= lines.length)
                throw new Error(`Line Index Out of Bounds, received: ${lineIndex}`)

            if (charIndex < 0 || charIndex >= lines[lineIndex].length)
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
                        currCharIndex = lines[currLineIndex].length
                        continue
                    }
                    currCharIndex = currCharIndex - l
                    l = Math.abs(length)
                    break
                }
            }

            while (1) {
                // get current line string/substring length
                let currStrLen = lines[currLineIndex].substring(currCharIndex).length

                if (currCharIndex == 0 && l >= currStrLen) {
                    lines.splice(currLineIndex, 1) // just remove the line from arr

                    // currLineIndex stays the same since we removed entry from lines arr
                    // so indexes after removed line shifted left
                    l -= currStrLen
                    currCharIndex = 0

                    continue
                }

                let sBeforeDel = lines[currLineIndex].substring(0, currCharIndex)
                // use 2 substr since first creates a new 0 index starting str
                // and second removes correct num of chars
                // .substring(length) works with length > str.length
                let sAfterDel = lines[currLineIndex].substring(currCharIndex).substring(l)
                lines[currLineIndex] = sBeforeDel + sAfterDel

                if (l > currStrLen) {
                    l -= currStrLen
                    currLineIndex++
                    currCharIndex = 0
                } else {
                    break
                }
            }
        },
        toString: () => lines.join('\n')
    }
}