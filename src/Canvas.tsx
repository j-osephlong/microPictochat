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

function drawCanvasFrameLayer(canvas: HTMLCanvasElement, userName: string) {
    let context = canvas.getContext("2d")

    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)

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
    let nameWidth = context.measureText(userName).width

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
    context.fillText(userName, namePadding, 8 + (canvas.clientHeight / numBars) / 2)
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

let drawAtPoint = (canvasContext: CanvasRenderingContext2D, canvasPoint: CanvasPoint, weight: number, tool: Tool) => {
    let pixelPoint = PixelPoint.fromCanvasPoint(canvasPoint)

    // console.log(`DRAW-POINT - ${pixelPoint.point} - color: ${this.penColorRGBA.values}/${this.penColorRGBA.toHexString()}`)
    canvasContext.beginPath()
    canvasContext.fillStyle = canvasState.penColorRGBA.toHexString()
    canvasContext.strokeStyle = canvasState.penColorRGBA.toHexString()
    if (tool == Tool.Pen)
        canvasContext.rect(
            pixelPoint.point[0],
            pixelPoint.point[1],
            penSize * weight,
            penSize * weight
        )
    else
        canvasContext.clearRect(
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

let onPenInputStart = (event: TouchEvent | MouseEvent, tool: Tool) => {
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
        1,
        tool
    )

    canvasState.lastInputCanvasPoint = canvasPoint
}

let onPenInputMove = (event: TouchEvent | MouseEvent, tool: Tool) => {
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
        drawAtPoint((event.target as HTMLCanvasElement).getContext('2d')!, CanvasPoint.fromCanvasPoint(p), penWeightFunction(canvasPoint), tool)
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

function toDataUrl(): string {
    const mergeLayer = document.getElementById('canvas-merge-layer') as HTMLCanvasElement
    const bgLayer = document.getElementById('canvas-bg-layer') as HTMLCanvasElement
    const drawLayer = document.getElementById('draw-layer') as HTMLCanvasElement
    const frameLayer = document.getElementById('canvas-frame-layer') as HTMLCanvasElement

    const mergeLayerCtx = mergeLayer.getContext("2d")

    mergeLayerCtx?.drawImage(bgLayer, 0, 0, bgLayer.clientWidth, bgLayer.clientHeight)
    mergeLayerCtx?.drawImage(drawLayer, 0, 0, drawLayer.clientWidth, drawLayer.clientHeight)
    mergeLayerCtx?.drawImage(frameLayer, 0, 0, frameLayer.clientWidth, frameLayer.clientHeight)

    let dataURL = mergeLayer.toDataURL()
    mergeLayerCtx?.clearRect(0, 0, mergeLayer.width, mergeLayer.height)

    return dataURL
}

function _Canvas(props: { controlsBinding: CanvasControlsBinder }) {
    const state = usePictoState()
    const stateDispatch = useStateDispatch()

    // let canvasBgLayerRef = createRef<HTMLCanvasElement>()
    // let canvasDrawLayerRef = useRef<HTMLCanvasElement>()
    // let canvasTempTextLayerRef = createRef<HTMLCanvasElement>()
    // let canvasFrameLayerRef = createRef<HTMLCanvasElement>()
    // let canvasMergeLayerRef = createRef<HTMLCanvasElement>()
    // let containerRef = createRef<HTMLDivElement>()

    let writeTextToTempLayer = () => {
        if (!state.currentTextPosition) return

        let canvas = document.getElementById('canvas-temp-text-layer') as HTMLCanvasElement
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

        const container = document.getElementById('canvas-container') as HTMLDivElement

        prepareCanvas(document.getElementById('canvas-bg-layer') as HTMLCanvasElement, container)
        prepareCanvas(document.getElementById('draw-layer') as HTMLCanvasElement, container)
        prepareCanvas(document.getElementById('canvas-temp-text-layer') as HTMLCanvasElement, container)
        prepareCanvas(document.getElementById('canvas-frame-layer') as HTMLCanvasElement, container)
        prepareCanvas(document.getElementById('canvas-merge-layer') as HTMLCanvasElement, container)
        drawCanvasBgLayer(document.getElementById('canvas-bg-layer') as HTMLCanvasElement)
        drawCanvasFrameLayer(document.getElementById('canvas-frame-layer') as HTMLCanvasElement, state.userName)

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

    useEffect(() => {
        drawCanvasFrameLayer(document.getElementById('canvas-frame-layer') as HTMLCanvasElement, state.userName)
    }, [state.userName])

    return (
        <div id='canvas-container' style={{ width: "100%", height: "58%" }}>
            <canvas id="canvas-bg-layer" className="canvas-layer"></canvas>
            <canvas className="canvas-layer" id="draw-layer"
                onMouseDown={
                    state.tool != Tool.Text ? (e) => { onPenInputStart(e.nativeEvent, state.tool) } : e => {
                        onTextPositionInput(e.nativeEvent,
                            state.currentText,
                            state.currentTextPosition,
                            (pos) => { stateDispatch({ type: StateActionType.SetCurrentTextPosition, position: pos }) },
                            (txt) => { stateDispatch({ type: StateActionType.SetCurrentText, text: txt }) }
                        )
                    }
                }
                onMouseMove={state.tool != Tool.Text ? (e) => { onPenInputMove(e.nativeEvent, state.tool) } : undefined}
                onMouseUp={state.tool != Tool.Text ? (e) => { onPenInputEnd(e.nativeEvent) } : undefined}
                onTouchStart={
                    state.tool != Tool.Text ? (e) => { onPenInputStart(e.nativeEvent, state.tool) } : e => {
                        e.preventDefault()
                        onTextPositionInput(e.nativeEvent,
                            state.currentText,
                            state.currentTextPosition,
                            (pos) => { stateDispatch({ type: StateActionType.SetCurrentTextPosition, position: pos }) },
                            (txt) => { stateDispatch({ type: StateActionType.SetCurrentText, text: txt }) }
                        )
                    }
                }
                onTouchMove={state.tool != Tool.Text ? (e) => { onPenInputMove(e.nativeEvent, state.tool) } : undefined}
                onTouchEnd={state.tool != Tool.Text ? (e) => { onPenInputEnd(e.nativeEvent) } : undefined}></canvas>
            <canvas id="canvas-temp-text-layer" className="canvas-layer"></canvas>
            <canvas id="canvas-frame-layer" className="canvas-layer"></canvas>
            <canvas id="canvas-merge-layer" className="canvas-layer"></canvas>
        </div>
    )
}

export { _Canvas }