import { createRef, ReactElement, useEffect, useRef, useState } from 'react'
import './App.css'
import { CanvasControlsBinder, _Canvas } from './Canvas'
import Controls from './Controls'
import { MessageHistory } from './MessageHistory'
import { StateActionType, StateProvider, useStateDispatch } from './reducer'

async function shareCanvas(blob: Blob) {
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

function App() {
  return (
    <StateProvider>
      <AppWithState />
    </StateProvider>
  )
}

function AppWithState() {
  let binder = useRef<CanvasControlsBinder>({})
  let stateDispatch = useStateDispatch()
  let launchShareSheet = async (dataURL: string) => {
    let blob = await (await fetch(dataURL)).blob()
    shareCanvas(blob)
  }

  let [canvasSentAnimation, setCanvasSentAnimation] = useState(false)

  return (
    <div className="App">
      <_Canvas controlsBinding={binder.current} canvasSentAnimation={canvasSentAnimation} setCanvasSentAnimation={setCanvasSentAnimation}></_Canvas>
      <Controls
        onSend={async () => {
          setCanvasSentAnimation(true)

          if (binder.current.share == null) {
            console.log("Null share")
            return
          }
          let historyItem = binder.current.share()
          launchShareSheet(historyItem.dataUrl)

          stateDispatch({
            type: StateActionType.PushMessageToHistory,
            historyItem: historyItem
          })
        }}
        onUndo={() => { binder.current.undo?.call(null) }}
        onErase={() => { binder.current.clear?.call(null) }} />
      <MessageHistory onImport={binder.current.import!}></MessageHistory>
    </div>
  )
}

export default App
