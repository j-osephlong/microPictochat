export const penSize: number = 4

export class CanvasPoint {
    point: [number, number]

    private constructor(
        canvasPoint: [number, number]
    ) {
        this.point = canvasPoint
    }

    static fromPixelPoint = (
        pixelPoint: PixelPoint
    ): CanvasPoint => {
        let canvasPoint: [number, number] = [
            Math.floor(pixelPoint.point[0] / penSize),
            Math.floor(pixelPoint.point[1] / penSize)
        ]
        return new CanvasPoint(canvasPoint)
    }

    static fromCanvasPoint = (
        canvasPoint: [number, number]
    ): CanvasPoint => {
        return new CanvasPoint(canvasPoint)
    }

    plus = (operand: [number, number]): CanvasPoint => {
        return CanvasPoint.fromCanvasPoint([this.point[0] + operand[0], this.point[1] + operand[1]])
    }

    toPixelPoint = (): PixelPoint => {
        return PixelPoint.fromCanvasPoint(this)
    }
}

export class PixelPoint {
    point: [number, number]

    private constructor(
        pixelPoint: [number, number]
    ) {
        this.point = pixelPoint
    }

    static fromUnadjustedPoint = (unadjustedPoint: [number, number], canvasWidth: number, canvasHeight: number) => {
        let pixelPoint: [number, number] = [
            Math.floor(unadjustedPoint[0] / penSize) * penSize,
            Math.floor(unadjustedPoint[1] / penSize) * penSize
        ]
        return new PixelPoint(pixelPoint)
    }

    static fromCanvasPoint = (canvasPoint: CanvasPoint): PixelPoint => {
        let pixelPoint: [number, number] = [
            canvasPoint.point[0] * penSize,
            canvasPoint.point[1] * penSize
        ]

        return new PixelPoint(pixelPoint)
    }

    toCanvasPoint = () => {
        return CanvasPoint.fromPixelPoint(this)
    }
}