import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /**
   * Rendered in place of `children` once an error has been caught. The function
   * form also receives the React component stack (available on the render after
   * componentDidCatch fires), useful for on-screen diagnostics.
   */
  fallback:
    | ReactNode
    | ((error: Error, retry: () => void, componentStack?: string) => ReactNode)
}

interface State {
  error: Error | null
  componentStack?: string
}

/**
 * Contains render/commit errors from its subtree (including a lazy()
 * component's dynamic import rejecting) so a single broken chart, chunk-load
 * failure, or unexpected data shape degrades gracefully instead of taking
 * down the entire app with a blank screen — the failure stays local to
 * whatever is wrapped, and the rest of the page keeps working.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    this.setState({ componentStack: info.componentStack })
  }

  retry = () => this.setState({ error: null, componentStack: undefined })

  render() {
    const { error, componentStack } = this.state
    if (error) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(error, this.retry, componentStack)
        : this.props.fallback
    }
    return this.props.children
  }
}
