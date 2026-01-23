import { GameProvider } from './context/GameContext'
import Home from './Home'
import './App.css'

function App() {
  return (
    <GameProvider>
      <Home />
    </GameProvider>
  )
}

export default App