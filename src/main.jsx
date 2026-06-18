import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Blog from './pages/Blog.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Blog />
  </StrictMode>
)
