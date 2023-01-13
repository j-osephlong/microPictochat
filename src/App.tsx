import { createRef, ReactElement, useEffect, useRef, useState } from 'react'
import './App.css'
import { CanvasControlsBinder, _Canvas } from './Canvas'
import Controls from './Controls'
import { MessageHistory } from './MessageHistory'
import { StateActionType, StateProvider, usePictoState, useStateDispatch } from './reducer'

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

function isSupportedScreenDimensions(): boolean {
  return document.body.clientWidth <= document.body.clientHeight * 0.9
}

function App() {
  let [screenSizeSupported, setScreenSizeSupported] = useState(true)
  useEffect(() => {
    window.addEventListener('resize', () => {
      setScreenSizeSupported(isSupportedScreenDimensions())
    })
  })

  return (
    <>
      {screenSizeSupported ?
        <StateProvider>
          < AppWithState />
        </StateProvider > :
        <ScreenSizeNotSupportedMessage></ScreenSizeNotSupportedMessage>
      }
    </>
  )
}

function ScreenSizeNotSupportedMessage() {
  return (
    <div id='screen-size-message-container'>
      <h1>Sorry, but your screen size isn't supported.</h1>
      <h2>This app was made for portrait mode, <br />try it on your phone!</h2>
    </div>
  )
}

function UserNamePrompt() {
  alert("You forgot to set your name!\nTap on the edit button in the \"Player Name\" box.")
}

function AppWithState() {
  let binder = useRef<CanvasControlsBinder>({})
  let state = usePictoState()
  let stateDispatch = useStateDispatch()
  let launchShareSheet = async (dataURL: string) => {
    let blob = await (await fetch(dataURL)).blob()
    shareCanvas(blob)
  }

  let [canvasSentAnimation, setCanvasSentAnimation] = useState(false)
  let [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    document.fonts.ready.then(() => setFontsLoaded(true))
  }, [])

  return (
    <div className="App">
      {fontsLoaded &&
        <_Canvas
          controlsBinding={binder.current}
          canvasSentAnimation={canvasSentAnimation}
          setCanvasSentAnimation={setCanvasSentAnimation}></_Canvas>
      }
      <Controls
        onSend={async () => {
          if (state.userName == "j-osephlong") {
            UserNamePrompt()
            return
          }

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
