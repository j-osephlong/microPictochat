import { createRef, ReactElement, useEffect, useRef } from 'react'
import './App.css'
import { CanvasControlsBinder, _Canvas } from './Canvas'
import Controls from './Controls'
import { StateProvider } from './reducer'

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
  let canvasRef = createRef<HTMLCanvasElement>()
  useEffect(() => {
    console.debug(canvasRef)
  })
  let binder: CanvasControlsBinder = {}

  return (
    <StateProvider>
      <div className="App">
        <_Canvas controlsBinding={binder}></_Canvas>
        {/* <button onClick={() => { canvasRef.current?.share() }}>Blob</button> */}
        <Controls
          onSend={async () => {
            if (binder.share == null) return
            let dataURL = binder.share()
            let blob = await (await fetch(dataURL)).blob()
            shareCanvas(blob)
          }}
          onUndo={() => { binder.undo?.call(null) }}
          onDebug={() => { console.debug(canvasRef.current) }}
          onErase={() => { binder.clear?.call(null) }} />
      </div>
    </StateProvider>
  )
}

export default App
