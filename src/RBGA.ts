export class RGBA {
    values: [number, number, number, number]

    constructor(values: [number, number, number, number]) {
        this.values = values
        values.forEach(i => console.assert(i <= 255 && i >= 0), values)
    }

    static fromHexString = (str: string): RGBA => {
        let aOffset = 0
        let a = 255
        if (str.length == 9) {
            aOffset = 2
            a = Number.parseInt(str.slice(1, 3), 16)
        }
        let r = Number.parseInt(str.slice(1 + aOffset, 3 + aOffset), 16)
        let g = Number.parseInt(str.slice(3 + aOffset, 5 + aOffset), 16)
        let b = Number.parseInt(str.slice(5 + aOffset), 16)
        return new RGBA([r, g, b, a])
    }

    toHexString = () => {
        let str = "#"
        this.values.map(i => i.toString(16)).forEach(s => {
            if (s.length == 1) str += "0"
            str += s
        })
        return str
    }

    equals = (other: RGBA) =>
        this.values[0] == other.values[0] &&
        this.values[1] == other.values[1] &&
        this.values[2] == other.values[2] &&
        this.values[3] == other.values[3]
}