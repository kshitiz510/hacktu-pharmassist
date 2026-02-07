import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dasboard from './pages/Dashboard'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dasboard />} />
      </Routes>
    </Router>
  )
}

export default App
