export class RGBA {
    values: [number, number, number, number]

    constructor(values: [number, number, number, number]) {
        this.values = values
        values.forEach(i => console.assert(i <= 255 && i >= 0), values)
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