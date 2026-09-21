import { PortfolioProvider } from "./state/PortfolioProvider.jsx";
import { UiProvider } from "./state/UiProvider.jsx";
import { AppShell } from "./components/layout/AppShell.jsx";
import { Felgrans } from "./components/Felgrans.jsx";
import { SEKTIONER } from "./sections/index.js";
import { UnderMigrering } from "./sections/UnderMigrering.jsx";
import { useUi } from "./state/hooks.js";

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

export default function App() {
  return (
    /* UiProvider ligger ytterst så att portföljlagret kan nå toasten — en
       statusändring ska kvittera "uppdaterad och loggad" som i originalet.
       Ui-lagret håller bara vy, tema och dialoger och behöver ingen portföljdata. */
    <UiProvider>
      <PortfolioProvider>
        <AppShell>
          <AktivSektion />
        </AppShell>
      </PortfolioProvider>
    </UiProvider>
  );
}
