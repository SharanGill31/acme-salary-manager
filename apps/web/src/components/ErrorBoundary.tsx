import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box role="alert" sx={{ padding: 4, textAlign: "center" }}>
          <Typography variant="h6" component="p" gutterBottom>
            Something went wrong.
          </Typography>
          <Button variant="contained" onClick={this.handleRetry}>
            Retry
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
