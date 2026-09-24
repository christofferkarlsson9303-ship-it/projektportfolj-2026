/* Nyckeltalskort för översikten.

   Ersätter Kpi här för att ett nyckeltal i portföljen nästan alltid är en
   summa av flera projekt. Förut låg fördelningen som en punktsträng i hint
   ("36037 70 d · 36038 72 d · …"), som bröts mitt i ett värde så fort kortet
   blev smalt. Nu är varje del en egen rad med etikett och värde som aldrig
   bryts isär — det är raderna som får radbrytas, inte siffrorna.

   ton styr accentfärg på värde och ikon: "" (neutral), "ok", "warn", "bad". */
export function Metrikkort({ ikon: Ikon, etikett, varde, enhet, ton = "", delar = [], fot }) {
  return (
    <article className={`metric ${ton}`.trim()}>
      <div className="metric-topp">
        <h3 className="metric-etikett">{etikett}</h3>
        {Ikon ? (
          <span className="metric-ikon" aria-hidden="true">
            <Ikon size={18} strokeWidth={2} />
          </span>
        ) : null}
      </div>

      <div className="metric-varde">
        {varde}
        {enhet ? <span className="metric-enhet">{enhet}</span> : null}
      </div>

      {delar.length ? (
        <ul className="metric-delar">
          {delar.map((d, i) => (
            <li key={`${i}-${d.etikett}`} className={d.ton || undefined}>
              <span>{d.etikett}</span>
              <b>{d.varde}</b>
            </li>
          ))}
        </ul>
      ) : null}

      {fot ? <div className="metric-fot">{fot}</div> : null}
    </article>
  );
}
