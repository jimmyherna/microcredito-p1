import { Component, type ReactNode } from "react";

/** Evita que un fallo de render deje una pantalla en blanco: muestra `alternativa` y permite reintentar. */
export default class LimiteError extends Component<{ children: ReactNode; alternativa: (reintentar: () => void) => ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    if (this.state.fallo) return this.props.alternativa(() => this.setState({ fallo: false }));
    return this.props.children;
  }
}
