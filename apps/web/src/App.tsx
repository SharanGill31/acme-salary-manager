import { CssBaseline, ThemeProvider, Typography, createTheme } from "@mui/material";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const theme = createTheme();

function HomePage() {
  return (
    <main>
      <Typography variant="h1" component="h1">
        Acme Salary Manager
      </Typography>
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
