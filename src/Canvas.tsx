import React, { createRef, ReactElement, useEffect, useImperativeHandle, useRef } from 'react'
import { computeLine } from './bresehamLine';
import { CanvasPoint, penSize, PixelPoint } from './Point';
import { RGBA } from './RBGA';
import { PictoState, StateActionType, Tool, usePictoState, useStateDispatch } from './reducer';

const maxHistoryDepth = 10

export type CanvasControlsBinder = {
    undo?: () => void,
    share?: () => string,
    clear?: () => void
}

class CanvasHistory {
    dataUrlHistory: ImageData[] = []

    pushCanvas(imageData: ImageData) {
        this.dataUrlHistory.push(imageData)
        if (this.dataUrlHistory.length > maxHistoryDepth)
            this.dataUrlHistory.shift()
    }

    popCanvas(): ImageData | null {
        return this.dataUrlHistory.pop() ?? null
    }
}

function prepareCanvas(canvas: HTMLCanvasElement, container: HTMLDivElement) {
    console.debug(canvas)

    let context = canvas.getContext("2d")

    var scale = window.devicePixelRatio; // Change to 1 on retina screens to see blurry canvas.
    canvas.style.width = container.clientWidth + "px";
    canvas.style.height = container.clientHeight + "px";

    canvas.width = container.clientWidth * scale;
    canvas.height = container.clientHeight * scale;


    context?.scale(scale, scale);
}

const numBars = 7
const barThickness = 2
const charWidth = 15
const namePadding = 14
const numChars = 8

function drawCanvasBgLayer(canvas: HTMLCanvasElement) {
    let context = canvas.getContext("2d")

    if (!context) return

    context.fillStyle = "white"

    context.beginPath()
    context.moveTo(10, 2);
    context.lineTo(canvas.clientWidth - 10, 2); context.lineTo(canvas.clientWidth - 2, 10)
    context.lineTo(canvas.clientWidth - 2, canvas.clientHeight - 10); context.lineTo(canvas.clientWidth - 10, canvas.clientHeight - 2)
    context.lineTo(10, canvas.clientHeight - 2); context.lineTo(2, canvas.clientHeight - 10);
    context.lineTo(2, 10); context.lineTo(10, 0)
    context.fill()

    context.beginPath()
    context.fillStyle = "#bdbaf2"

    for (const i of Array(numBars).keys()) {
        if (i == 0) continue
        context.beginPath()
        context.rect(0, i * (canvas.clientHeight / numBars), canvas.clientWidth, barThickness)
        context.fill()
    }
}

function drawCanvasFrameLayer(canvas: HTMLCanvasElement) {
    let context = canvas.getContext("2d")

    if (!context) return

    //draw frame
    context.strokeStyle = "#5a4eb7"
    context.lineWidth = barThickness

    context.beginPath()
    context.moveTo(10, 1);
    context.lineTo(canvas.clientWidth - 10, 1); context.lineTo(canvas.clientWidth - 1, 10)
    context.lineTo(canvas.clientWidth - 1, canvas.clientHeight - 10); context.lineTo(canvas.clientWidth - 10, canvas.clientHeight - 1)
    context.lineTo(10, canvas.clientHeight - 1); context.lineTo(1, canvas.clientHeight - 10);
    context.lineTo(1, 10); context.lineTo(10, 0)
    context.stroke()

    context.font = "28px Nintendo DS BIOS"
    let nameWidth = context.measureText("slime ball").width

    //draw name container bg
    context.fillStyle = "#bab7f2"
    context.beginPath()
    context.moveTo(10, 1);
    context.lineTo(nameWidth + namePadding * 2, 1); context.lineTo(nameWidth + namePadding * 2, canvas.clientHeight / numBars - 10)
    context.lineTo((nameWidth + namePadding * 2) - 10, canvas.clientHeight / numBars + 1); context.lineTo(1, canvas.clientHeight / numBars + 1)
    context.lineTo(1, 10); context.lineTo(10, 0)
    context.fill()
    //draw name container frame
    context.stroke()

    context.fillStyle = "#5a4eb7"
    context.fillText("slime ball", namePadding, 8 + (canvas.clientHeight / numBars) / 2)
}

let canvasState: {
    penColorRGBA: RGBA,
    lastInputCanvasPoint: CanvasPoint | null,
    mouseDown: boolean,
    history: CanvasHistory
} = {
    penColorRGBA: new RGBA([0, 0, 0, 255]),
    lastInputCanvasPoint: null,
    mouseDown: false,
    history: new CanvasHistory()
}

let pushHistory = () => {
    let canvas = document.getElementById('draw-layer') as HTMLCanvasElement
    let imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)
    if (!imageData) return
    canvasState.history.pushCanvas(imageData)
}

let canvasCoordsFromPageCoords = (input: [number, number]): [number, number] | null => {
    let canvas = document.getElementById('draw-layer') as HTMLCanvasElement

    let bounds = canvas.getBoundingClientRect()
    return [input[0] - bounds.left - scrollX, input[1] - bounds.top - scrollY]
}

let drawAtPoint = (canvasContext: CanvasRenderingContext2D, canvasPoint: CanvasPoint, weight: number) => {
    let pixelPoint = PixelPoint.fromCanvasPoint(canvasPoint)

    // console.log(`DRAW-POINT - ${pixelPoint.point} - color: ${this.penColorRGBA.values}/${this.penColorRGBA.toHexString()}`)
    canvasContext.beginPath()
    canvasContext.fillStyle = canvasState.penColorRGBA.toHexString()
    canvasContext.strokeStyle = canvasState.penColorRGBA.toHexString()
    canvasContext.rect(
        pixelPoint.point[0],
        pixelPoint.point[1],
        penSize * weight,
        penSize * weight
    )
    canvasContext.fill()
    canvasContext.closePath()
}

let penWeightFunction = (newPoint: CanvasPoint): number => {
    if (!canvasState.lastInputCanvasPoint) return 1
    let dist = Math.sqrt(
        Math.pow(Math.abs(newPoint.point[0] - canvasState.lastInputCanvasPoint!.point[0]), 2) +
        Math.pow(Math.abs(newPoint.point[1] - canvasState.lastInputCanvasPoint!.point[1]), 2)
    )
    let weight = Math.floor(Math.log10(4 * dist) * 2)
    let altWeight = (1 / (1 + Math.pow(Math.E, dist * -1 * 2 + 4))) * 2.5 + 1
    return altWeight
}

let onPenInputStart = (event: TouchEvent | MouseEvent) => {
    let coords = canvasCoordsFromPageCoords(
        [
            event instanceof TouchEvent ? event.touches[0].clientX :
                (event as MouseEvent).clientX,
            event instanceof TouchEvent ? event.touches[0].clientY :
                (event as MouseEvent).clientY
        ]
    )

    if (!coords) return

    let pixelPoint = PixelPoint.fromUnadjustedPoint(
        coords,
        (event.target as HTMLCanvasElement).width,
        (event.target as HTMLCanvasElement).height
    )

    if (event instanceof MouseEvent) canvasState.mouseDown = true

    let canvasPoint = pixelPoint.toCanvasPoint()
    if (canvasPoint.point == canvasState.lastInputCanvasPoint?.point) return

    pushHistory()

    console.log(`${pixelPoint.point} - ${canvasPoint.point}`)
    drawAtPoint(
        (event.target as HTMLCanvasElement).getContext('2d')!,
        canvasPoint,
        1
    )

    canvasState.lastInputCanvasPoint = canvasPoint
}

let onPenInputMove = (event: TouchEvent | MouseEvent) => {
    if (event instanceof MouseEvent && !canvasState.mouseDown) return
    if (canvasState.lastInputCanvasPoint == null) return

    let coords = canvasCoordsFromPageCoords(
        [
            event instanceof TouchEvent ? event.touches[0].clientX :
                (event as MouseEvent).clientX,
            event instanceof TouchEvent ? event.touches[0].clientY :
                (event as MouseEvent).clientY
        ]
    )

    if (!coords) return

    let pixelPoint = PixelPoint.fromUnadjustedPoint(
        coords,
        (event.target as HTMLCanvasElement).width,
        (event.target as HTMLCanvasElement).height
    )

    let canvasPoint = pixelPoint.toCanvasPoint()
    if (canvasPoint.point == canvasState.lastInputCanvasPoint?.point) return

    let line = computeLine(canvasState.lastInputCanvasPoint?.point!, canvasPoint.point)
    line.forEach(p => {
        drawAtPoint((event.target as HTMLCanvasElement).getContext('2d')!, CanvasPoint.fromCanvasPoint(p), penWeightFunction(canvasPoint))
    })

    canvasState.lastInputCanvasPoint = canvasPoint
}

let onPenInputEnd = (event: TouchEvent | MouseEvent) => {
    if (event instanceof MouseEvent) canvasState.mouseDown = false
}

let onTextPositionInput = (
    event: TouchEvent | MouseEvent,
    currentText: string,
    currentTextPosition: [number, number] | null,
    onSetPosition: (pos: [number, number]) => void,
    onSetText: (txt: string) => void
) => {
    event.preventDefault()
    if (currentText != "" && currentTextPosition)
        commitText(currentText, currentTextPosition, onSetText)

    let coord = canvasCoordsFromPageCoords(
        [
            event instanceof TouchEvent ? event.touches[0].clientX :
                (event as MouseEvent).clientX,
            event instanceof TouchEvent ? event.touches[0].clientY :
                (event as MouseEvent).clientY
        ]
    )

    if (!coord) return

    onSetPosition(coord)

    console.log(coord)
}

let commitText = (
    currentText: string,
    currentTextPosition: [number, number] | null,
    onSetText: (txt: string) => void
) => {
    if (!currentTextPosition) return
    pushHistory()

    let canvas = document.getElementById('draw-layer') as HTMLCanvasElement
    let ctx = canvas.getContext('2d')!

    ctx.font = "28px Nintendo DS BIOS"

    ctx.fillStyle = "black"
    ctx.fillText(currentText, currentTextPosition[0], currentTextPosition[1])

    onSetText("")
}

let onUndo = () => {
    let canvas = document.getElementById('draw-layer') as HTMLCanvasElement
    let ctx = canvas.getContext('2d')
    let imageData = canvasState.history.popCanvas()
    if (!imageData) return

    ctx?.putImageData(imageData, 0, 0)
}

let onClear = () => {
    let canvas = document.getElementById('draw-layer') as HTMLCanvasElement
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
}

function _Canvas(props: { controlsBinding: CanvasControlsBinder }) {
    const state = usePictoState()
    const stateDispatch = useStateDispatch()

    let canvasBgLayerRef = createRef<HTMLCanvasElement>()
    let canvasDrawLayerRef = useRef<HTMLCanvasElement>()
    let canvasTempTextLayerRef = createRef<HTMLCanvasElement>()
    let canvasFrameLayerRef = createRef<HTMLCanvasElement>()
    let canvasMergeLayerRef = createRef<HTMLCanvasElement>()
    let containerRef = createRef<HTMLDivElement>()

    function toDataUrl(): string {
        const mergeLayerCtx = canvasMergeLayerRef.current?.getContext("2d")

        mergeLayerCtx?.drawImage(canvasBgLayerRef.current!, 0, 0, canvasBgLayerRef.current!.clientWidth, canvasBgLayerRef.current!.clientHeight)
        mergeLayerCtx?.drawImage(canvasDrawLayerRef.current!, 0, 0, canvasDrawLayerRef.current!.clientWidth, canvasDrawLayerRef.current!.clientHeight)
        mergeLayerCtx?.drawImage(canvasFrameLayerRef.current!, 0, 0, canvasFrameLayerRef.current!.clientWidth, canvasFrameLayerRef.current!.clientHeight)

        let dataURL = canvasMergeLayerRef.current!.toDataURL()
        mergeLayerCtx?.clearRect(0, 0, canvasMergeLayerRef.current!.width, canvasMergeLayerRef.current!.height)

        return dataURL
    }

    let writeTextToTempLayer = () => {
        if (!state.currentTextPosition) return

        let canvas = canvasTempTextLayerRef.current!
        let ctx = canvas.getContext('2d')!

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        ctx.font = "28px Nintendo DS BIOS"

        ctx.fillStyle = "black"
        ctx.fillText(state.currentText, state.currentTextPosition[0], state.currentTextPosition[1])
    }

    useEffect(() => {
        props.controlsBinding.undo = onUndo
        props.controlsBinding.clear = onClear
        props.controlsBinding.share = toDataUrl


        canvasDrawLayerRef.current = document.getElementById('draw-layer') as HTMLCanvasElement

        prepareCanvas(canvasBgLayerRef.current!, containerRef.current!)
        prepareCanvas(canvasDrawLayerRef.current!, containerRef.current!)
        prepareCanvas(canvasTempTextLayerRef.current!, containerRef.current!)
        prepareCanvas(canvasFrameLayerRef.current!, containerRef.current!)
        prepareCanvas(canvasMergeLayerRef.current!, containerRef.current!)
        drawCanvasBgLayer(canvasBgLayerRef.current!)
        drawCanvasFrameLayer(canvasFrameLayerRef.current!)

    }, [])

    useEffect(() => {
        // not text tool anymore, but there is non consumed text
        if (state.tool != Tool.Text && state.currentText != "")
            commitText(state.currentText, state.currentTextPosition, (txt) => {
                stateDispatch({ type: StateActionType.SetCurrentText, text: txt })
            })
    }, [state.tool])

    useEffect(() => {
        console.log(state.currentText)
        writeTextToTempLayer()
    }, [state.currentText])

    return (
        <div id='canvas-container' ref={containerRef} style={{ width: "100%", height: "58%" }}>
            <canvas ref={canvasBgLayerRef} className="canvas-layer"></canvas>
            <canvas className="canvas-layer" id="draw-layer"
                onMouseDown={
                    state.tool == Tool.Pen ? (e) => { onPenInputStart(e.nativeEvent) } : e => {
                        onTextPositionInput(e.nativeEvent,
                            state.currentText,
                            state.currentTextPosition,
                            (pos) => { stateDispatch({ type: StateActionType.SetCurrentTextPosition, position: pos }) },
                            (txt) => { stateDispatch({ type: StateActionType.SetCurrentText, text: txt }) }
                        )
                    }
                }
                onMouseMove={state.tool == Tool.Pen ? (e) => { onPenInputMove(e.nativeEvent) } : undefined}
                onMouseUp={state.tool == Tool.Pen ? (e) => { onPenInputEnd(e.nativeEvent) } : undefined}
                onTouchStart={
                    state.tool == Tool.Pen ? (e) => { onPenInputStart(e.nativeEvent) } : e => {
                        e.preventDefault()
                        onTextPositionInput(e.nativeEvent,
                            state.currentText,
                            state.currentTextPosition,
                            (pos) => { stateDispatch({ type: StateActionType.SetCurrentTextPosition, position: pos }) },
                            (txt) => { stateDispatch({ type: StateActionType.SetCurrentText, text: txt }) }
                        )
                    }
                }
                onTouchMove={state.tool == Tool.Pen ? (e) => { onPenInputMove(e.nativeEvent) } : undefined}
                onTouchEnd={state.tool == Tool.Pen ? (e) => { onPenInputEnd(e.nativeEvent) } : undefined}></canvas>
            <canvas ref={canvasTempTextLayerRef} className="canvas-layer"></canvas>
            <canvas ref={canvasFrameLayerRef} className="canvas-layer"></canvas>
            <canvas ref={canvasMergeLayerRef} className="canvas-layer"></canvas>
        </div>
    )
}

export { _Canvas }

/**
 * interface Canvas {
    // onUndo: () => void
}

class Canvas extends React.Component {
    history: CanvasHistory = new CanvasHistory()

    penColorRGBA: RGBA = new RGBA([0, 0, 0, 255])
    lastInputCanvasPoint: CanvasPoint | null = null

    mouseDown: boolean = false

    canvasBgLayerRef = createRef<HTMLCanvasElement>()
    canvasDrawLayerRef = createRef<HTMLCanvasElement>()
    canvasFrameLayerRef = createRef<HTMLCanvasElement>()
    canvasMergeLayerRef = createRef<HTMLCanvasElement>()
    containerRef = createRef<HTMLDivElement>()

    constructor(props: Canvas) {
        super(props)
    }

    componentDidMount(): void {
        prepareCanvas(this.canvasBgLayerRef.current!, this.containerRef.current!)
        prepareCanvas(this.canvasDrawLayerRef.current!, this.containerRef.current!)
        prepareCanvas(this.canvasFrameLayerRef.current!, this.containerRef.current!)
        prepareCanvas(this.canvasMergeLayerRef.current!, this.containerRef.current!)
        drawCanvasBgLayer(this.canvasBgLayerRef.current!)
        drawCanvasFrameLayer(this.canvasFrameLayerRef.current!)

        let canvas = this.canvasDrawLayerRef.current!
        canvas.addEventListener('touchstart', e => { this.onInputStart(e); e.preventDefault() })
        canvas.addEventListener('mousedown', this.onInputStart)

        canvas.addEventListener('touchmove', e => { this.onInputMove(e); e.preventDefault() })
        canvas.addEventListener('mousemove', this.onInputMove)

        canvas.addEventListener('touchend', e => { this.onInputEnd(e); e.preventDefault() })
        canvas.addEventListener('mouseup', this.onInputEnd)
    }

    render(): React.ReactNode {
        return (
            <div id='canvas-container' ref={this.containerRef} style={{ width: "100%", height: "58%" }}>
                <canvas ref={this.canvasBgLayerRef} className="canvas-layer"></canvas>
                <canvas ref={this.canvasDrawLayerRef} className="canvas-layer" id="draw-layer"></canvas>
                <canvas ref={this.canvasFrameLayerRef} className="canvas-layer"></canvas>
                <canvas ref={this.canvasMergeLayerRef} className="canvas-layer"></canvas>
            </div>
        )
    }

    toDataUrl(): string {
        const mergeLayerCtx = this.canvasMergeLayerRef.current?.getContext("2d")

        mergeLayerCtx?.drawImage(this.canvasBgLayerRef.current!, 0, 0, this.canvasBgLayerRef.current!.clientWidth, this.canvasBgLayerRef.current!.clientHeight)
        mergeLayerCtx?.drawImage(this.canvasDrawLayerRef.current!, 0, 0, this.canvasDrawLayerRef.current!.clientWidth, this.canvasDrawLayerRef.current!.clientHeight)
        mergeLayerCtx?.drawImage(this.canvasFrameLayerRef.current!, 0, 0, this.canvasFrameLayerRef.current!.clientWidth, this.canvasFrameLayerRef.current!.clientHeight)

        let dataURL = this.canvasMergeLayerRef.current!.toDataURL()
        mergeLayerCtx?.clearRect(0, 0, this.canvasMergeLayerRef.current!.width, this.canvasMergeLayerRef.current!.height)

        return dataURL
    }

    async toBlob(): Promise<Blob> {
        return (await fetch(this.toDataUrl())).blob()
    }

    async share() {
        let blob = await this.toBlob()

        const filesArray = [
            new File(
                [blob],
                'pictochat-message.png',
                {
                    type: blob.type,
                    lastModified: new Date().getTime()
                }
            )
        ]
        const shareData = {
            files: filesArray,
            title: "PictoChat"
        }
        navigator.share(shareData)
    }

    onInputStart = (event: TouchEvent | MouseEvent) => {
        this.canvasDrawLayerRef.current!.getBoundingClientRect()

        let pixelPoint = PixelPoint.fromUnadjustedPoint(
            this.canvasCoordsFromPageCoords(
                [
                    event instanceof TouchEvent ? event.touches[0].clientX :
                        (event as MouseEvent).clientX,
                    event instanceof TouchEvent ? event.touches[0].clientY :
                        (event as MouseEvent).clientY
                ]
            ),
            (event.target as HTMLCanvasElement).width,
            (event.target as HTMLCanvasElement).height
        )

        if (event instanceof MouseEvent) this.mouseDown = true

        let canvasPoint = pixelPoint.toCanvasPoint()
        if (canvasPoint.point == this.lastInputCanvasPoint?.point) return

        this.pushHistory()

        console.log(`${pixelPoint.point} - ${canvasPoint.point}`)
        this.drawAtPoint(
            (event.target as HTMLCanvasElement).getContext('2d')!,
            canvasPoint,
            1
        )

        this.lastInputCanvasPoint = canvasPoint
    }

    onInputMove = (event: TouchEvent | MouseEvent) => {
        if (event instanceof MouseEvent && !this.mouseDown) return
        if (this.lastInputCanvasPoint == null) return

        let pixelPoint = PixelPoint.fromUnadjustedPoint(
            this.canvasCoordsFromPageCoords(
                [
                    event instanceof TouchEvent ? event.touches[0].clientX :
                        (event as MouseEvent).clientX,
                    event instanceof TouchEvent ? event.touches[0].clientY :
                        (event as MouseEvent).clientY
                ]
            ),
            (event.target as HTMLCanvasElement).width,
            (event.target as HTMLCanvasElement).height
        )

        let canvasPoint = pixelPoint.toCanvasPoint()
        if (canvasPoint.point == this.lastInputCanvasPoint.point) return

        let line = computeLine(this.lastInputCanvasPoint.point, canvasPoint.point)
        line.forEach(p => {
            this.drawAtPoint((event.target as HTMLCanvasElement).getContext('2d')!, CanvasPoint.fromCanvasPoint(p), this.penWeightFunction(canvasPoint))
        })

        this.lastInputCanvasPoint = canvasPoint
    }

    onInputEnd = (event: TouchEvent | MouseEvent) => {
        if (event instanceof MouseEvent) this.mouseDown = false

    }

    drawAtPoint = (canvasContext: CanvasRenderingContext2D, canvasPoint: CanvasPoint, weight: number) => {
        let pixelPoint = PixelPoint.fromCanvasPoint(canvasPoint)

        // console.log(`DRAW-POINT - ${pixelPoint.point} - color: ${this.penColorRGBA.values}/${this.penColorRGBA.toHexString()}`)
        canvasContext.beginPath()
        canvasContext.fillStyle = this.penColorRGBA.toHexString()
        canvasContext.strokeStyle = this.penColorRGBA.toHexString()
        canvasContext.rect(
            pixelPoint.point[0],
            pixelPoint.point[1],
            penSize * weight,
            penSize * weight
        )
        canvasContext.fill()
        canvasContext.closePath()
    }

    canvasCoordsFromPageCoords(input: [number, number]): [number, number] {
        let bounds = this.canvasDrawLayerRef.current!.getBoundingClientRect()
        return [input[0] - bounds.left - scrollX, input[1] - bounds.top - scrollY]
    }

    penWeightFunction(newPoint: CanvasPoint): number {
        if (!this.lastInputCanvasPoint) return 1
        let dist = Math.sqrt(
            Math.pow(Math.abs(newPoint.point[0] - this.lastInputCanvasPoint.point[0]), 2) +
            Math.pow(Math.abs(newPoint.point[1] - this.lastInputCanvasPoint.point[1]), 2)
        )
        let weight = Math.floor(Math.log10(4 * dist) * 2)
        let altWeight = (1 / (1 + Math.pow(Math.E, dist * -1 * 2 + 4))) * 2.5 + 1
        return altWeight
    }

    pushHistory() {
        let canvas = this.canvasDrawLayerRef.current!
        let imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)
        if (!imageData) return
        this.history.pushCanvas(imageData)
    }

    undo() {
        let canvas = this.canvasDrawLayerRef.current!
        let ctx = canvas.getContext('2d')
        let imageData = this.history.popCanvas()
        if (!imageData) return

        ctx?.putImageData(imageData, 0, 0)
    }

    clear() {
        let canvas = this.canvasDrawLayerRef.current!
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    }
}
 */