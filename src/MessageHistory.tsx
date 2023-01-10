import { useEffect, useState } from "react"
import { HistoryItem, usePictoState } from "./reducer"

function MessageHistoryItem(props: { historyItem: HistoryItem, onImport: (dataUrl: string) => void }) {
    let [isNew, setIsNew] = useState(true)
    useEffect(() => {
        setTimeout(() => setIsNew(false), 60)
    }, [])
    let widthPx = props.historyItem.clientWidth * 0.7 + 'px'
    let heightPx = props.historyItem.clientHeight * 0.7 + 'px'

    return (
        <div className={"history-item" + (isNew ? " new" : "")} style={{ height: heightPx }}>
            <img src={props.historyItem.dataUrl} width={widthPx} height={heightPx}></img>
            <div className="import-button" onClick={() => { props.onImport(props.historyItem.drawLayerDataUrl) }}>
                <span className="material-symbols-outlined"
                    style={{
                        fontVariationSettings:
                            "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 48",
                        fontSize: "24px"
                    }}>open_in_browser</span>
            </div>
        </div>
    )
}

interface MessageHistory {
    onImport: (dataUrl: string) => void
}

function MessageHistory(props: MessageHistory) {
    let state = usePictoState()
    console.debug(state.messageHistory)
    return (
        <div id="message-history">
            {state.messageHistory.map((historyItem, index) =>
                <MessageHistoryItem historyItem={historyItem} key={historyItem.id} onImport={props.onImport}></MessageHistoryItem>
            )}
            <div style={{ width: "100%", height: "4vmin" }}></div>
        </div>
    )
}

export { MessageHistory }