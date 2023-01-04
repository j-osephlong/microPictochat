export function computeLine(startPoint: [number, number], endPoint: [number, number]): Array<[number, number]> {
    if (startPoint == null)
        return [endPoint]

    let line = Array<[number, number]>()

    let dx = Math.abs(endPoint[0] - startPoint[0])
    let sx = startPoint[0] < endPoint[0] ? 1 : -1
    let dy = -1 * Math.abs(endPoint[1] - startPoint[1])
    let sy = startPoint[1] < endPoint[1] ? 1 : -1

    let error = dx + dy

    let xCurr = startPoint[0]
    let yCurr = startPoint[1]

    while (true) {
        line.push([xCurr, yCurr])
        if (xCurr == endPoint[0] &&
            yCurr == endPoint[1])
            break
        if (2 * error >= dy) {
            if (xCurr == endPoint[0]) break
            error += dy
            xCurr += sx
        }

        if (2 * error <= dx) {
            if (yCurr == endPoint[1]) break
            error += dx
            yCurr += sy
        }
    }

    return line
}