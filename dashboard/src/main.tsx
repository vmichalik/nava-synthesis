import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import { navaTheme, fontFaceCSS } from '@navalabs-dev/brand-mui'
import App from './App'

// Inject Muoto font faces into the Nava theme's CssBaseline
const theme = createTheme(navaTheme, {
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        ${fontFaceCSS('/fonts/')}
        ${(navaTheme.components?.MuiCssBaseline as any)?.styleOverrides || ''}
      `,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
