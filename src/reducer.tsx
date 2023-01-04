import { createContext, useContext, useReducer } from "react"

enum Tool { Pen, Eraser, Text }

enum ToolSize { Small, Big }

enum StateActionType {
    SetToolAction, SetCurrentText, SetCurrentTextPosition, SetUserName, SetToolSize
}

type SetToolAction = {
    type: StateActionType.SetToolAction,
    tool: Tool
}

type SetToolSize = {
    type: StateActionType.SetToolSize,
    toolSize: ToolSize
}

type SetCurrentText = {
    type: StateActionType.SetCurrentText,
    text: string
}

type SetCurrentTextPosition = {
    type: StateActionType.SetCurrentTextPosition,
    position: [number, number] | null
}

type SetUserName = {
    type: StateActionType.SetUserName,
    name: string
}

type StateAction = SetToolAction | SetCurrentText | SetCurrentTextPosition | SetUserName | SetToolSize

export type PictoState = {
    tool: Tool
    currentText: string
    currentTextPosition: [number, number] | null
    userName: string
    toolSize: ToolSize
}

const initialState: PictoState = {
    tool: Tool.Pen,
    toolSize: ToolSize.Small,
    currentText: "",
    currentTextPosition: null,
    userName: "j-osephlong"
}

function stateReducer(state: PictoState, action: StateAction): PictoState {
    switch (action.type) {
        case StateActionType.SetToolAction: {
            let newState = { ...state }
            newState.tool = action.tool

            return newState
        }
        case StateActionType.SetCurrentText: {
            let newState = { ...state }
            newState.currentText = action.text
            return newState
        }
        case StateActionType.SetCurrentTextPosition: {
            let newState = { ...state }
            newState.currentTextPosition = action.position
            return newState

        }
        case StateActionType.SetUserName: {
            let newState = { ...state }
            newState.userName = action.name
            return newState
        }
        case StateActionType.SetToolSize: {
            let newState = { ...state }
            newState.toolSize = action.toolSize
            return newState
        }

        default: return state
    }
}

const StateContext = createContext<PictoState>(initialState)
const StateDispatchContext = createContext<React.Dispatch<StateAction>>(() => null)

function StateProvider({ children }: { children: JSX.Element }) {
    const [state, stateDispatch] = useReducer(stateReducer, initialState)

    return (
        <StateContext.Provider value={state}>
            <StateDispatchContext.Provider value={stateDispatch}>
                {children}
            </StateDispatchContext.Provider>
        </StateContext.Provider>
    )
}

function usePictoState() {
    return useContext(StateContext);
}

function useStateDispatch() {
    return useContext(StateDispatchContext);
}

export { stateReducer, StateProvider, usePictoState, useStateDispatch, StateActionType, Tool, ToolSize }