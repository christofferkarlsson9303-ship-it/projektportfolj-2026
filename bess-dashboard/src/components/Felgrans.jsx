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
        <pre className="felgrans-text">
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

/** Den lokala kopian av portföljen, för nedladdning när appen inte går att starta. */
function lokalKopia() {
  try {
    const ut = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("batchc-portfolj")) ut[k] = localStorage.getItem(k);
    }
    return Object.keys(ut).length ? ut : null;
  } catch {
    return null;
  }
}

/* Yttersta felgränsen — runt inloggning, datalager, sidhuvud och meny. Ett fel
   där gav förut en vit sida. Här finns i stället en omladdning och, om det
   finns en lokal kopia, en knapp som sparar den som fil. */
export class AppFelgrans extends Component {
  constructor(props) {
    super(props);
    this.state = { fel: null };
  }

  static getDerivedStateFromError(fel) {
    return { fel };
  }

  componentDidCatch(fel, info) {
    console.error("Fel i appen", fel, info);
  }

  laddaNed = () => {
    const kopia = lokalKopia();
    if (!kopia) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(kopia)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `projektportfolj-lokal-kopia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  render() {
    if (!this.state.fel) return this.props.children;
    const harKopia = !!lokalKopia();
    return (
      <div className="inlogg">
        <div className="card inlogg-kort" role="alert">
          <h3>Appen stötte på ett fel</h3>
          <div className="lead">
            Ladda om sidan. Ändringar som redan sparats finns kvar. Händer det igen, spara den lokala kopian och skicka
            den tillsammans med felet nedan.
          </div>
          <pre className="felgrans-text">{String(this.state.fel?.message || this.state.fel)}</pre>
          <div className="rowbtns">
            <button type="button" className="btn" onClick={() => location.reload()}>
              Ladda om
            </button>
            {harKopia ? (
              <button type="button" className="btn sec" onClick={this.laddaNed}>
                Spara lokal kopia
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}
