import { PortfolioProvider } from "./state/PortfolioProvider.jsx";
import { UiProvider } from "./state/UiProvider.jsx";
import { AuthProvider } from "./state/AuthProvider.jsx";
import { AppShell } from "./components/layout/AppShell.jsx";
import { Felgrans } from "./components/Felgrans.jsx";
import { Inloggning } from "./components/Inloggning.jsx";
import { SEKTIONER } from "./sections/index.js";
import { UnderMigrering } from "./sections/UnderMigrering.jsx";
import { useAuth, useUi } from "./state/hooks.js";

function AktivSektion() {
  const { aktivVy } = useUi();
  const Komponent = SEKTIONER[aktivVy];

  return (
    // key gör att felgränsen nollställs när man byter vy — annars fastnar
    // hela arbetsytan i felläge efter ett fel i en enskild sektion.
    <Felgrans key={aktivVy} vy={aktivVy}>
      {Komponent ? <Komponent /> : <UnderMigrering vy={aktivVy} />}
    </Felgrans>
  );
}

function Portfoljen() {
  return (
    <PortfolioProvider>
      <AppShell>
        <AktivSektion />
      </AppShell>
    </PortfolioProvider>
  );
}

/* Släpper igenom direkt när Supabase inte är konfigurerat — då kör appen
   lokalt läge som tidigare, utan inloggning. Är den konfigurerad krävs både
   inloggning och en plats på allowed_users, för RLS ger ändå ingen data. */
function Grind() {
  const { status, tillaten, kontrollerad } = useAuth();

  if (status === "okonfigurerad") return <Portfoljen />;
  if (status === "laddar" || (status === "inloggad" && !kontrollerad)) {
    return (
      <div className="inlogg">
        <div className="card inlogg-kort">
          <div className="lead">Ansluter…</div>
        </div>
      </div>
    );
  }
  if (status === "utloggad" || !tillaten) return <Inloggning />;

  return <Portfoljen />;
}

export default function App() {
  return (
    /* UiProvider ligger ytterst så att portföljlagret kan nå toasten — en
       statusändring ska kvittera "uppdaterad och loggad" som i originalet.
       Ui-lagret håller bara vy, tema och dialoger och behöver ingen portföljdata. */
    <UiProvider>
      <AuthProvider>
        <Grind />
      </AuthProvider>
    </UiProvider>
  );
}
