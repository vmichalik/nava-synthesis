import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { navaTheme } from '@navalabs-dev/brand-mui'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={navaTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
