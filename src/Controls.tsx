import { useEffect, useState } from "react"
import { RGBA } from "./RBGA"
import { PenColorMode, StateActionType, Tool, ToolSize, usePictoState, useStateDispatch } from "./reducer"

function PenSVG({ penColorMode }: { penColorMode: PenColorMode }) {
    return (
        <div style={{ width: "35px", height: "35px" }}>
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
            <div id="pen-color-hint"
                className={penColorMode == PenColorMode.Rainbow ? "rainbow-bg" : ""}
                style={penColorMode == PenColorMode.Default ? { backgroundColor: "black" } : {}}
            ></div>
        </div>
    )
}

function EraserSVG() {
    return (
        <div style={{ width: "35px", height: "35px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="var(--svg-fg)" strokeWidth={3}>
                <rect width="100" height="100" stroke="var(--svg-bg)" fill="var(--svg-bg)" />

                <polygon points="
                    56 22 
                    64 22
                    92 36
                    52 58
                    7 40
                " stroke="var(--svg-fg)" fill="white" />

                <polygon points="
                    52 58
                    7 40
                    7 62
                    52 82
                " stroke="var(--svg-fg)" fill="white" />

                <polygon points="
                    92 56
                    52 82
                    52 58
                    92 36
                " stroke="var(--svg-fg)" fill="white" />

            </svg>
        </div>
    )
}

function TextSVG() {
    return (
        <div style={{ width: "35px", height: "35px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="white" strokeWidth="3">
                <rect width="100" height="100" stroke="var(--svg-bg)" fill="var(--svg-bg)" />

                <text x="15" y="74" fontSize="85px" fill="white" stroke="#ffffff">T</text>

                <line x1="58.5" x2="71.5" y1="20" y2="20" strokeWidth="5" />
                <line x1="75.5" x2="88.5" y1="20" y2="20" strokeWidth="5" />
                <line x1="73.5" x2="73.5" y1="78" y2="22" strokeWidth="5" />
                <line x1="58.5" x2="71.5" y1="80" y2="80" strokeWidth="5" />
                <line x1="75.5" x2="88.5" y1="80" y2="80" strokeWidth="5" />
            </svg>
        </div>
    )
}

function BigSizeSVG() {
    return (
        <div style={{ width: "35px", height: "35px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="white" strokeWidth="2">
                <rect width="100" height="100" stroke="var(--svg-bg)" fill="var(--svg-bg)" />
                <circle cx="50" cy="50" r="30" fill="var(--svg-fg)" stroke="var(--svg-fg)" />
            </svg>
        </div>
    )
}

function SmallSizeSVG() {
    return (
        <div style={{ width: "35px", height: "35px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="white" strokeWidth="2">
                <rect width="100" height="100" stroke="var(--svg-bg)" fill="var(--svg-bg)" />

                <rect width="25" height="25" x="37.5" y="37.5" fill="var(--svg-fg)" stroke="var(--svg-fg)" />
            </svg>
        </div>
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

interface OctagonShape {
    children?: JSX.Element | string | null,
    width?: string | number,
    height?: string | number,
    color?: RGBA
    borderColor?: RGBA
    style?: React.CSSProperties
}

const OctagonShapeDefaults: OctagonShape = {
    children: null,
    width: "100%",
    height: "13vw",
    color: RGBA.fromHexString("#d9d7d5"),
    borderColor: RGBA.fromHexString("#555555"),
    style: {}
}

function OctagonShape(props: OctagonShape) {
    let _props = { ...OctagonShapeDefaults, ...props }
    return (
        <div className="octagon" style={{
            width: _props.width,
            height: _props.height,
            backgroundColor: _props.borderColor!.toHexString()
        }}>
            <div className="octagon-inset" style={{ ...props.style, backgroundColor: _props.color!.toHexString() }}>
                {_props.children}
            </div>
        </div>
    )
}

interface Controls {
    onSend: () => void
    onUndo: () => void
    onErase: () => void
}

function Controls(props: Controls) {
    const state = usePictoState()
    const stateDispatch = useStateDispatch()

    const [showNameEditButton, setShowNameEditButton] = useState(true)

    useEffect(() => {
        if (state.currentTextPosition)
            (document.getElementById("canvasTextInput") as HTMLInputElement).focus()
        // else
        //     document.body.focus()
    }, [state.currentTextPosition])

    return (
        <div id="controls-container">
            <OctagonShape height="10vw" color={RGBA.fromHexString("#000000")} style={{
                color: "#d6e800",
                alignItems: "center",
                paddingLeft: "4vmin",
                fontSize: "22px"
            }}>
                <>
                    Player Name:
                    <input type="text" id="name-input" maxLength={16}
                        value={state.userName}
                        onChange={(e) => {
                            stateDispatch({ type: StateActionType.SetUserName, name: e.target.value })
                            // e.target.style.width = (e.target.value.length + 1) + 'ch';
                        }} style={{ width: `${state.userName.length - 1 + 'ch'}` }}
                        onFocus={() => { setShowNameEditButton(false) }}
                        onBlur={() => { setShowNameEditButton(true) }}
                    ></input>
                    <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "14px", color: "white", marginLeft: "4px", display: showNameEditButton ? "inline-block" : "none" }}
                        onClick={() => {
                            document.getElementById('name-input')!.focus()

                        }}>
                        edit
                    </span>
                </>
            </OctagonShape>
            <OctagonShape style={{ marginTop: "2vmin" }}>
                <>
                    <FatButton style={{ width: "150%" }} onClick={props.onSend}>
                        SEND
                    </FatButton>
                    <FatButton onClick={props.onErase}>
                        ERASE
                    </FatButton>
                    <FatButton onClick={props.onUndo}>
                        UNDO
                    </FatButton>
                </>
            </OctagonShape>
            <div style={{ display: "flex", justifyContent: "space-between", }}>
                <div className="tiny-radio-row">
                    <TinyRadio
                        selected={state.tool == Tool.Pen}
                        onClick={() => {
                            if (state.tool != Tool.Pen)
                                stateDispatch({ type: StateActionType.SetToolAction, tool: Tool.Pen })
                            else
                                stateDispatch({
                                    type: StateActionType.SetPenColorMode,
                                    mode: state.penColorMode == PenColorMode.Default ? PenColorMode.Rainbow : PenColorMode.Default
                                })
                        }}>
                        <PenSVG penColorMode={state.penColorMode}></PenSVG>
                    </TinyRadio>
                    <TinyRadio selected={state.tool == Tool.Eraser} onClick={() => { stateDispatch({ type: StateActionType.SetToolAction, tool: Tool.Eraser }) }}><EraserSVG></EraserSVG></TinyRadio>
                    <TinyRadio selected={state.tool == Tool.Text} onClick={() => { stateDispatch({ type: StateActionType.SetToolAction, tool: Tool.Text }) }}><TextSVG></TextSVG></TinyRadio>
                </div>

                <div className="tiny-radio-row">
                    <TinyRadio selected={state.toolSize == ToolSize.Small} onClick={() => { stateDispatch({ type: StateActionType.SetToolSize, toolSize: ToolSize.Small }) }}><SmallSizeSVG></SmallSizeSVG></TinyRadio>
                    <TinyRadio selected={state.toolSize == ToolSize.Big} onClick={() => { stateDispatch({ type: StateActionType.SetToolSize, toolSize: ToolSize.Big }) }}><BigSizeSVG></BigSizeSVG></TinyRadio>
                </div>
            </div>
            <input type="text" id="canvasTextInput"
                value={state.currentText}
                onChange={(e) => { stateDispatch({ type: StateActionType.SetCurrentText, text: e.target.value }) }}
                onBlur={() => { stateDispatch({ type: StateActionType.SetToolAction, tool: Tool.Pen }) }}
                style={{ position: "absolute", left: "-100%", maxWidth: "50%", top: "0" }}></input>
        </div >
    )
}

export default Controls