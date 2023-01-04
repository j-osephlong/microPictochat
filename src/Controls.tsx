import { useEffect, useState } from "react"
import { StateActionType, Tool, usePictoState, useStateDispatch } from "./reducer"

function PenSVG() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="var(--svg-fg)" strokeWidth={3}>
            <rect width="100" height="100" stroke="var(--svg-bg)" fill="var(--svg-bg)" />

            <polygon points="
        8 85,
        50 85,
        95 50,
        90 50
    " fill="var(--svg-shadow)" stroke="transparent" />

            <polygon points="
        75 8, 
        90 20,
        35 82,
        20 70
    " fill="white" stroke="transparent" />

            <polygon points="
        86.25 17,
        90 20,
        35 82,
        31.25 79
    " fill="var(--svg-bg)" stroke="transparent" />

            <polygon points="
        75 8, 
        90 20,
        35 82,
        20 70
    " fill="transparent" stroke="var(--svg-fg)" />

            <polygon points="
        20.2 73.4,
        31 82.3,
        22, 82
    " fill="var(--svg-fg)" />
        </svg>
    )
}

function TextSVG() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="white" stroke-width="3">
            <rect width="100" height="100" stroke="var(--svg-bg)" fill="var(--svg-bg)" />

            <text x="15" y="74" font-size="85px" fill="white" stroke="#ffffff">T</text>

            <line x1="58.5" x2="71.5" y1="20" y2="20" stroke-width="5" />
            <line x1="75.5" x2="88.5" y1="20" y2="20" stroke-width="5" />
            <line x1="73.5" x2="73.5" y1="78" y2="22" stroke-width="5" />
            <line x1="58.5" x2="71.5" y1="80" y2="80" stroke-width="5" />
            <line x1="75.5" x2="88.5" y1="80" y2="80" stroke-width="5" />
        </svg>
    )
}

function FatButton({ children, onClick, style }: { children?: JSX.Element | string, onClick?: () => void, style?: React.CSSProperties }) {
    return (
        <div className="fat-button" onClick={onClick} style={style}>
            <span className="stroke-text">{children}</span>
            {children}
        </div>
    )
}

interface TinyRadio {
    children?: JSX.Element | string,
    onClick?: () => void,
    selected?: boolean
}

function TinyRadio(props: TinyRadio) {
    return (
        <div className={`tiny-radio ${props.selected ? "selected" : ""}`} onClick={props.onClick}>
            {props.children}
        </div>
    )
}

interface Controls {
    onSend: () => void
    onUndo: () => void
    onDebug: () => void
    onErase: () => void
}

function Controls(props: Controls) {
    const state = usePictoState()
    const stateDispatch = useStateDispatch()

    useEffect(() => {
        if (state.currentTextPosition)
            (document.getElementById("canvasTextInput") as HTMLInputElement).focus()
        // else
        //     document.body.focus()
    }, [state.currentTextPosition])

    return (
        <div id="controls-container">
            <div id="octagon"></div>
            <div id="octagon-inset">
                <FatButton style={{ width: "150%" }} onClick={props.onSend}>
                    SEND
                </FatButton>
                <FatButton onClick={props.onErase}>
                    ERASE
                </FatButton>
                <FatButton onClick={props.onUndo}>
                    UNDO
                </FatButton>
                <FatButton onClick={props.onDebug}>
                    DBG
                </FatButton>
            </div>
            <div className="tiny-radio-row" style={{ top: "-10%" }}>
                <TinyRadio selected={state.tool == Tool.Pen} onClick={() => { stateDispatch({ type: StateActionType.SetToolAction, tool: Tool.Pen }) }}><PenSVG></PenSVG></TinyRadio>
                <TinyRadio selected={state.tool == Tool.Text} onClick={() => { stateDispatch({ type: StateActionType.SetToolAction, tool: Tool.Text }) }}><TextSVG></TextSVG></TinyRadio>
            </div>
            <input type="text" id="canvasTextInput" value={state.currentText} onChange={(e) => { stateDispatch({ type: StateActionType.SetCurrentText, text: e.target.value }) }} style={{ width: "0", height: "0", overflow: "hidden", opacity: "0" }}>

            </input>
        </div>
    )
}

export default Controls