import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";

/* Upplysningsrutan — antaganden, rutiner och varningar i löptext.

   Ytan är lugn (sunken) och tonen sitter bara i den smala kanten och ikonen,
   så att rött och orange förblir accenter enligt ONE Nordics profil:
   info (ONE Blå, standard), warn (orange, bevaka/åtgärda), bad (röd, brister)
   och ok (klart). Ikonen är dekor; texten bär budskapet. Den första <b> i
   texten fungerar som rubrik. */

const TON = {
  info: { kant: "border-l-one-bla", ikon: Info, farg: "text-info-ink" },
  warn: { kant: "border-l-orange", ikon: TriangleAlert, farg: "text-warn-ink" },
  bad: { kant: "border-l-rod", ikon: OctagonAlert, farg: "text-bad-ink" },
  ok: { kant: "border-l-turkos", ikon: CircleCheck, farg: "text-ok-ink" },
};

export function Callout({ ton = "info", className = "", children, ...rest }) {
  const t = TON[ton] || TON.info;
  const Ikon = t.ikon;
  return (
    <div
      data-ton={ton}
      className={`flex min-w-0 items-start gap-3 rounded-lg border border-l-[3px] border-solid border-hairline bg-sunken px-4 py-3 text-[13px] leading-relaxed text-ink [&_b]:text-ink ${t.kant} ${className}`.trim()}
      {...rest}
    >
      <Ikon size={16} strokeWidth={2.2} aria-hidden="true" className={`mt-0.5 shrink-0 ${t.farg}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
