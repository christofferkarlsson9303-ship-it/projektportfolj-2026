import { Component } from "react";

/* Felgräns per sektion. Ett fel i en vy ska inte släcka hela portföljen —
   standalone-versionen kraschade hela rita() om en enda sektion kastade. */
export class Felgrans extends Component {
  constructor(props) {
    super(props);
    this.state = { fel: null };
  }

  static getDerivedStateFromError(fel) {
    return { fel };
  }

  componentDidCatch(fel, info) {
    console.error("Fel i sektion", this.props.vy, fel, info);
  }

  render() {
    if (!this.state.fel) return this.props.children;
    return (
      <div className="card" role="alert">
        <h3>Något gick fel i den här vyn</h3>
        <div className="lead">
          Resten av portföljen fungerar — byt vy i menyn, eller ladda om sidan. Dina data är sparade.
        </div>
        <pre
          style={{
            background: "var(--sunken)", borderRadius: 10, padding: 12,
            fontSize: 12, overflowX: "auto", color: "var(--ink-soft)",
          }}
        >
          {String(this.state.fel?.message || this.state.fel)}
        </pre>
        <div className="rowbtns">
          <button type="button" className="btn sec mini" onClick={() => this.setState({ fel: null })}>
            Försök igen
          </button>
        </div>
      </div>
    );
  }
}
