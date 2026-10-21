import { Component } from "react";
import { arDelfilFel } from "../lib/laddaOm.js";

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
    const text = String(this.state.fel?.message || this.state.fel);
    const ny = arDelfilFel(this.state.fel);
    return (
      <div className="card" role="alert">
        <h3>{ny ? "Appen har uppdaterats" : "Något gick fel i den här vyn"}</h3>
        <div className="lead">
          {ny
            ? "En ny version har publicerats sedan sidan öppnades. Ladda om sidan för att öppna vyn. Dina data är sparade."
            : "Resten av portföljen fungerar — byt vy i menyn, eller ladda om sidan. Dina data är sparade."}
        </div>
        <div className="rowbtns">
          <button type="button" className="btn mini" onClick={() => window.location.reload()}>
            Ladda om sidan
          </button>
          <button type="button" className="btn sec mini" onClick={() => this.setState({ fel: null })}>
            Försök igen
          </button>
        </div>
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ink-soft)" }}>Teknisk information</summary>
          <pre
            style={{
              background: "var(--sunken)", borderRadius: 10, padding: 12, marginTop: 8,
              fontSize: 12, overflowX: "auto", color: "var(--ink-soft)",
            }}
          >
            {text}
          </pre>
        </details>
      </div>
    );
  }
}
