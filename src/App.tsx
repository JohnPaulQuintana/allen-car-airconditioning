import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import OCRTest from './pages/OCRTest'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <OCRTest />
    </>
  )
}

export default App
