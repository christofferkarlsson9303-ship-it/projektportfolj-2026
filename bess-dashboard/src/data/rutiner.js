/* RUTINER — grunddata extraherad ur standalone-filen.
   Rör inte logiken: detta är ren data. */

export const RUTINER = [
  { id:"1", titel:"Projektledaren — roll, ansvar och befogenheter", kalla:"Projektledaren (ONE Nordic)",
    ingress:"Projektledaren är ansvarig för genomförandet av projektet och fungerar som projektets VD inom projektets ramar. "+
      "Under projektledaren organiseras projektets övriga personal. Rollen innebär att styra och leda arbetet, "+
      "ta ansvar för att leverera resultat enligt givna mål och ramar, och löpande rapportera framsteg och läge "+
      "till den interna beställaren och/eller styrgruppen.",
    grupper:[
    { namn:"Projektledarens ansvar",
      info:"Bocka av när ansvaret är säkerställt för det här projektet.",
      punkter:[
        {n:"a1", t:"Före genomförandet gått igenom med interna beställaren att projektet har realistiska förutsättningar att lyckas"},
        {n:"a2", t:"Leder projektet mot målet inom fastställda tids-, resurs- och kostnadsramar i överenskommelse med interna beställaren"},
        {n:"a3", t:"Alla aktiviteter samordnas och utförs med kvalitet, med relevanta och nödvändiga kompetenser",
          h:"Samordning är projektledarens mest centrala uppgift — se de sju aktiviteterna nedan"},
        {n:"a4", t:"Inköp genomförs inom projektets ram och enligt företagets attestregler",
          h:"Se kapitel 2.3 Inköp, underentreprenörer och materialleverantörer"},
        {n:"a5", t:"Projektet är resurssäkrat — projektdeltagare kontrakterade med respektive chef och resursägare",
          h:"Se fliken Resurser för beläggning och kapacitet"},
        {n:"a6", t:"Avvikelser från överenskomna planer rapporteras direkt till interna beställaren, styrgrupp kallas vid behov"},
        {n:"a7", t:"Kommunikations- och informationsplanen följs"} ] },

    { namn:"Samordning — de sju aktiviteterna",
      info:"Samordning i projekt är det mest centrala i projektledarens uppgifter och är uppdelat i dessa aktiviteter. Bocka av allteftersom projektet passerar dem.",
      punkter:[
        {n:"s1", t:"Analysera beställning"},
        {n:"s2", t:"Planera projektet eller fasen"},
        {n:"s3", t:"Led projektgenomförandet"},
        {n:"s4", t:"Följ upp projektgenomförandet"},
        {n:"s5", t:"Hantera och styr ändringar", h:"ÄTA och hinder — se kapitel 2.4 och 2.5"},
        {n:"s6", t:"Genomför överlämning", h:"Se kapitel 3.1 och fliken Slutdokumentation"},
        {n:"s7", t:"Stäng projektet"} ] },

    { namn:"Befogenheter",
      info:"Projektledaren förfogar över de resurser som styrgruppen ställt till förfogande genom beslut om projektbeskrivningen, "+
        "och beslutar hur projektet ska bedrivas och vilka arbetsformer som ska användas.",
      punkter:[
        {n:"b1", t:"Klarlagt vilka resurser styrgruppen ställt till förfogande genom beslut om projektbeskrivningen"},
        {n:"b2", t:"Bestämt hur projektet ska bedrivas och vilka arbetsformer som ska användas"},
        {n:"b3", t:"Ekonomiska och beslutsmässiga befogenheter klargjorda i överenskommelse med interna beställaren",
          h:"Ska klargöras i varje enskilt projekt"} ] },

    { namn:"Kunskapsområden att hålla levande", text:[
      "Projektplanering — tidslinjer, budget och resursallokering som håller projektet på rätt spår.",
      "Riskhantering — identifiera risker och ta fram strategier för att minska dem, så projektet blir klart i tid och inom budget.",
      "Kommunikation — hålla alla intressenter informerade och engagerade; tydliggörs vanligen i en kommunikationsplan.",
      "Ledarskap — leda och motivera teamet så alla arbetar mot ett gemensamt mål.",
      "Problemlösning — identifiera och lösa problem när de uppstår, innan de blir förseningar.",
      "Flexibilitet och anpassningsförmåga — anpassa sig till förändrade omständigheter och fatta snabba beslut.",
      "Intressenthantering — hantera kunder, intern beställare och teammedlemmar.",
      "Tidshantering — säkerställa att projektet slutförs enligt tidtabell.",
      "Samordning och organisationsförmåga — planera, schemalägga och koordinera aktiviteter och resurser.",
      "Teamarbete — samarbeta med andra för att nå projektets mål.",
      "Resultatinriktning — hålla fokus på mål och resultat, och motivera andra att nå dem."
    ] } ] },

  { id:"2.1", titel:"Att organisera entreprenaden", kalla:"2.1 (ONE Nordic)", grupper:[
    { namn:"Lämna över obligatoriska handlingar",
      info:"Ska oftast ha lämnats över senast en viss tid efter kontraktsskrivning, vanligen två veckor. Läs kontraktet.",
      punkter:[
        {n:"fc", t:"Försäkringscertifikat överlämnat"},
        {n:"sak", t:"Säkerhet i original överlämnad"},
        {n:"ovr", t:"Övriga handlingar som beställaren kräver enligt kontraktet"} ] },
    { namn:"Bestäm Ones organisation",
      info:"Titta i projektdirektiven på Ones SharePoint.",
      punkter:[
        {n:"pl", t:"Projektledare utsedd"},
        {n:"beh", t:"Bestämt vem som får underrätta om ÄTA, ta emot ÄTA-beställning och underrätta om hinder"},
        {n:"bm", t:"Bestämt vem som deltar vid byggmöte och andra möten"},
        {n:"kallar", t:"Bestämt vem som kallar till byggmöte och andra möten"},
        {n:"byte", t:"Vid personalbyte: ny person uppfyller beställarens krav på rollen", h:"Kraven brukar stå i AF-delen under AFC/AFD.3"},
        {n:"godk", t:"Vid personalbyte: beställaren underrättad och har godkänt", h:"Att beställaren måste underrättas och godkänna är mer regel än undantag"} ] },
    { namn:"Möten",
      info:"Arbete ska inte påbörjas innan startmöte hållits. Startmöte ska hållas även när One är UE åt beställaren.",
      punkter:[
        {n:"start", t:"Startmöte kallat och hållet enligt kontraktet"},
        {n:"las", t:"Du har läst in dig på samtliga kontraktshandlingar"},
        {n:"behmed", t:"Behörigheter inom One meddelade beställaren under startmötet"},
        {n:"komm", t:"Klart hur kommunikation ska ske mellan One och beställaren, inkl. hur ÄTA beställs och på vilken blankett"},
        {n:"skrift", t:"Klarlagt om beställaren anser skriftlighetskravet uppfyllt genom anteckning i startmötesprotokollet"},
        {n:"fragor", t:"Frågor förberedda om vem som kallar till byggmöten, hur ofta, och vilka övriga möten One ska delta i"},
        {n:"prot", t:"Startmötesprotokollet mottaget, kontrollerat och undertecknat — kopia sparad"},
        {n:"borg", t:"Klarhet i beställarens organisation — vem som får ta emot underrättelser om och beställa ÄTA"},
        {n:"kal", t:"Kalenderpåminnelser inlagda för samtliga överenskomna möten och byggmöten"} ] } ] },

  { id:"2.2", titel:"Försäkringar", kalla:"2.2 (ONE Nordic)", grupper:[
    { namn:"Försäkringscertifikat",
      info:"One har egen försäkringsmäklare, Willis Towers Watson. Kontaktuppgifter finns på intranätet. Ones CFO har certifikaten.",
      punkter:[
        {n:"belopp", t:"Certifikat framtaget som motsvarar beloppet beställaren kräver i kontraktet", h:"Beloppet får inte vara större än kontraktskravet och får inte visa Ones fulla försäkringsbelopp"},
        {n:"nya", t:"Klarlagt om och när beställaren vill ha nya certifikat", h:"Brukar vara en gång per år när Ones försäkring förnyats"},
        {n:"pam", t:"Påminnelse inlagd i kalendern för inlämning av uppdaterade certifikat"} ] },
    { namn:"Försäkringsskada",
      punkter:[
        {n:"anm", t:"Inträffad eller anmäld skada har anmälts till Ones försäkringsbolag"},
        {n:"dok", t:"Allt kring skadan är dokumenterat och dialogen med beställaren hålls skriftlig"},
        {n:"jur", t:"Vid oenighet om att skada inträffat: Ones jurist kontaktad före försäkringsbolaget"} ] } ] },

  { id:"2.3", titel:"Inköp, underentreprenörer och materialleverantörer", kalla:"2.3 (ONE Nordic)", grupper:[
    { namn:"Inköp",
      info:"Back2back betyder att avtalet med UE/ML ska spegla Ones avtal med beställaren — uppförandekod, kontrollrätt, ansvars- och garantitid.",
      punkter:[
        {n:"godk", t:"Beställaren har godkänt valet av UE/ML, om avtalet förutsätter godkännande"},
        {n:"avtal", t:"Avtal mellan One och UE/ML framtaget och back2back med beställaravtalet"},
        {n:"bed", t:"Bedömning gjord av vilka delar i beställaravtalet som ska föras över på UE/ML"},
        {n:"inkop", t:"Bedömning och samtliga avtalshandlingar överlämnade till Ones inköpsavdelning"},
        {n:"sak", t:"Säkerhetsklassning av UE gjord, om sådan krävs"} ] },
    { namn:"Material och likvärdighet",
      punkter:[
        {n:"spec", t:"Inköpt material motsvarar det som specificeras i kontraktet"},
        {n:"anmal", t:"Vid avvikelse: skriftlig anmälan till beställaren med motivering, sparad på SharePoint"},
        {n:"likv", t:"Kontrollerat i kontraktshandlingarna om One har rätt att använda likvärdigt material, och om beställaren måste godkänna bytet", h:"Vid offentlig upphandling kan material oftast inte bytas genom överenskommelse"} ] },
    { namn:"Anlita eller byta UE/ML",
      punkter:[
        {n:"anbud", t:"Kontrollerat om förfrågningsunderlaget krävde att UE/ML angavs redan i anbudet"},
        {n:"begar", t:"Skriftlig begäran om godkännande skickad, om beställaren ska godkänna", h:"Står oftast i AF-delen under AFC/AFD.35"},
        {n:"medd", t:"Skriftligt meddelande skickat, om beställaren enbart ska informeras"},
        {n:"krav", t:"Kontrollerat att UE/ML uppfyller obligatoriska krav enligt förfrågningsunderlaget"} ] } ] },

  { id:"2.4", titel:"Störningar (hinder eller ÄTA) i arbetet med entreprenaden", kalla:"2.4 (ONE Nordic)",
    lank:["storning","Öppna Störning"],
    ingress:"Används när One av någon anledning inte kunnat utföra arbete som tänkt. En störning är allt som gör att "+
      "arbetet med entreprenaden inte fungerat som tänkt. Beror störningen på One som entreprenör — gå inte vidare. "+
      "Oavsett orsak ska beställaren underrättas genom Underrättelse om störning, och ifylld underrättelse sparas på SharePoint.",
    grupper:[
    { namn:"Dokumentera — detta ger rätt till betalt och tidsförlängning",
      info:"Dokumentationen sparas i projektmappen på SharePoint. Det är den som ger One möjlighet att få mer betalt och/eller tidsförlängning.",
      punkter:[
        {n:"d1", t:"Vilka som arbetar, och om det var fler eller färre än planerat"},
        {n:"d2", t:"Om mer arbete utförts än vad kontraktshandlingarna anger och än vad som förutsattes vid anbud"},
        {n:"d3", t:"Tidsåtgången för merarbetet"},
        {n:"d4", t:"Väderförhållanden"},
        {n:"d5", t:"Om alla redskap fanns på plats"},
        {n:"d6", t:"Om alla kartor fanns och stämde"} ] },

    { namn:"Klassificera störningen",
      info:"Vad störningen beror på avgör om den ska hanteras som hinder eller ÄTA. Underrättelse ska skickas i båda fallen.",
      punkter:[
        {n:"k1", t:"Fastställt att störningen inte beror på One som entreprenör", h:"Beror den på One — gå inte vidare"},
        {n:"k2", t:"HINDER: beställaren har inte gjort något som beställaren enligt kontraktet ska göra"},
        {n:"k3", t:"HINDER: underentreprenören har inte fått materialet i tid"},
        {n:"k4", t:"HINDER: en händelse i omvärlden"},
        {n:"k5", t:"HINDER: något på Ones sida har inte fungerat som tänkt", h:"Exempelvis att UE eller underleverantör varit sen"},
        {n:"k6", t:"ÄTA: vi har fått fel uppgifter av beställaren om entreprenaden"},
        {n:"k7", t:"ÄTA: förutsättningarna på arbetsområdet stämde inte med informationen vid anbud"},
        {n:"k8", t:"ÄTA: arbetsområdet var inte vad vi fackmässigt kunde förutsätta vid anbud"} ] },

    { namn:"ÄTA i dagboken — noteras för varje enskilt ÄTA",
      info:"Utforma dagboken på det sätt beställaren begärt enligt kontraktet. Fliken Dagbok bevakar samma sex fält.",
      punkter:[
        {n:"g1", t:"Startdatum för ÄTA"},
        {n:"g2", t:"Omfattningen av ÄTA — hur mycket arbete som krävts"},
        {n:"g3", t:"Väder och temperatur under utförandet"},
        {n:"g4", t:"Kostnad för ÄTA"},
        {n:"g5", t:"Förväntad tidsåtgång"},
        {n:"g6", t:"Faktisk tidsåtgång"},
        {n:"g7", t:"Om kontraktet kräver beställarens underskrift: dagboken skickad för signering med svarsfrist",
          h:"Skriv i följemejlet att dagboken betraktas som undertecknad om svar uteblir till angivet datum"} ] },

    { namn:"Fakturera för ÄTA",
      punkter:[
        {n:"f1", t:"ÄTA fakturerat enligt kontraktet med utdrag ur dagboken bifogat"},
        {n:"f2", t:"Bedömt om ÄTA-arbetet gör att kalkylen inte längre håller", h:"Om ja — se kapitel 2.5 När One vill ha mer betalt"} ] },

    { namn:"Hinder — åtgärder",
      info:"Enligt AB 04/ABT 06 finns inget krav på att beställaren ska godkänna hinderanmälan. Se dock vad som gäller i AF-delen och kontraktet.",
      punkter:[
        {n:"h1", t:"Fastställt vad hindret beror på: beställarens sida, omvärlden eller myndighetsbeslut, eller något oförutsebart på Ones sida"},
        {n:"h2", t:"Underrättelse om störning skickad till beställaren med förklaring av situationen och att kontraktstiden påverkas, sparad på SharePoint",
          h:"Måste göras omedelbart"},
        {n:"h3", t:"Det står i byggmötesprotokollet att One underrättat om hinder och vill omförhandla tidplanen",
          h:"Godkänn inte ett protokoll som saknar detta — justera och begär beställarens underskrift"},
        {n:"h4", t:"Eventuell ny tidplan är inskriven i byggmötesprotokollet"},
        {n:"h5", t:"Dagboken dokumenterar att hindret uppstått och vilken påverkan det fått"},
        {n:"h6", t:"All tid som tas i anspråk på grund av hindret dokumenteras löpande"},
        {n:"h7", t:"Kostnaderna dokumenteras och faktureras i slutet av entreprenaden, om hindret beror på beställaren eller någon på beställarens sida"} ] } ] },

  { id:"2.4.1", titel:"Underrättelse om störning — blanketten", kalla:"2.4.1 (AB 04/ABT 06)",
    lank:["storning","Upprätta underrättelse"],
    ingress:"Mall som används för att underrätta beställaren om störning i arbetet. Blanketten upprättas och skrivs ut "+
      "i fliken Störning. Ifylld och skickad underrättelse ska sparas på Ones SharePoint. Publikationsid 1646202, version 2, mall giltig fr.o.m. 2011-09-01.",
    grupper:[
    { namn:"Huvudet", text:[
      "AffärsID, AO-nummer, projekt, datum och revideringsdatum, upprättad av.",
      "Projektledare, projektchef och ÄTA-nummer.",
      "Till — mottagare hos beställaren."
    ] },
    { namn:"Blankettens fält", text:[
      "Ruta A — One skulle ha utfört följande arbete.",
      "Ruta B — följande personer var planerade att delta i arbetet.",
      "Ruta C — följande material, maskiner och verktyg hade planerats för arbetet.",
      "Ruta D — One kunde inte utföra arbetet på grund av.",
      "Ruta E — One var tvungna att vidta följande åtgärder.",
      "Ruta F — den fortsatta entreprenaden påverkas på följande sätt.",
      "Ruta G — övrigt och behov av besked, inklusive begäran om beställarens synpunkter och begäran om tidsförlängning.",
      "Ruta H — sista datum för beställarens besked."
    ] },
    { namn:"Kontroll före utskick",
      punkter:[
        {n:"u1", t:"Samtliga rutor A–H ifyllda"},
        {n:"u2", t:"Kryssat i begäran om beställarens synpunkter, om störningen utgör ÄTA-arbete"},
        {n:"u3", t:"Kryssat i att störningen innebär försening och begärt förlängning av del- och sluttider",
          h:"Ska alltid kryssas i"},
        {n:"u4", t:"Svarsdatum ifyllt i Ruta H"},
        {n:"u5", t:"Underrättelsen skickad till beställaren och sparad på Ones SharePoint"},
        {n:"u6", t:"Omförhandling av tidplanen tagen upp på nästa byggmöte och antecknad i protokollet"} ] } ] },

  { id:"2.4.2", titel:"Guide till hur Underrättelse om störning fylls i", kalla:"2.4.2 (ONE Nordic)",
    lank:["storning","Öppna Störning"],
    ingress:"Förklarar vilken information som ska framgå i varje ruta i blanketten Underrättelse om störning.",
    grupper:[
    { namn:"Ruta A — arbetet som skulle utföras", text:[
      "Beskriv kort vilket arbete som skulle utföras innan det visade sig att One inte kunde utföra det, antingen på grund av hinder eller ÄTA-arbete.",
      "Ange både planerat startdatum och planerat slutdatum.",
      "Exempel: Vi skulle ha utfört grävning med maskin X och Y för att kunna lägga ner kabel Z. Arbetet skulle ha påbörjats den 5 april 2022 och avslutats den 7 april 2022."
    ] },
    { namn:"Ruta B — personerna", text:[
      "Beskriv vilka personer som skulle ha deltagit i arbetet och vilka roller de har — montör, personal från underentreprenör, projektledare, beredare och så vidare."
    ] },
    { namn:"Ruta C — material och maskiner", text:[
      "Beskriv utförligt allt material och alla maskiner som hade avsatts för det aktuella arbetet."
    ] },
    { namn:"Ruta D — vad som hände", text:[
      "Berätta för beställaren vad som hänt som gjorde att arbetet inte kunde utföras som tänkt. Var så detaljerad som möjligt.",
      "Exempel 1: Vi fick fel nycklar.",
      "Exempel 2: Vi behövde först utföra X innan vi bedömde att vi skulle kunna utföra det planerade arbetet."
    ] },
    { namn:"Ruta E — åtgärderna", text:[
      "Beskriv vad som hände när arbetet inte kunde utföras som planerat.",
      "Exempel 1: Vi fick ringa person A och be denne komma med rätt nycklar. Vi kunde inte arbeta under den tiden.",
      "Exempel 2: Vi fick gräva ett större område än planerat. När vi hade gjort det kunde vi komma åt kabeln som skulle repareras."
    ] },
    { namn:"Ruta F — påverkan framåt", text:[
      "Skriv hur hindret eller ÄTA kommer att påverka det fortsatta arbetet. Krävs mer tid för färdigställande? Måste vissa arbeten planeras om?",
      "Exempel: Eftersom vi fick vänta på nycklar kunde vi inte utföra arbete under 4 timmar. När vi fick rätt nycklar behövdes anläggningen till annat arbete, så det planerade arbetet fick skjutas till nästa dag."
    ] },
    { namn:"Ruta G — checkboxarna", text:[
      "Checkboxen som begär beställarens synpunkter kryssas i om störningen utgjort ÄTA-arbete.",
      "Checkboxen om att störningen innebär försening ska alltid kryssas i.",
      "Därefter måste tidplanen förhandlas om med beställaren på nästa byggmöte, och att omförhandling begärts måste stå i byggmötesprotokollet."
    ] },
    { namn:"Ruta H — svarsfrist", text:[
      "Fyll i ett datum då beställaren senast måste ha svarat eller återkommit med synpunkter."
    ] } ] },

  { id:"2.5", titel:"När One vill ha mer betalt", kalla:"2.5 (ONE Nordic)", grupper:[
    { namn:"Prisförändringar och omförhandling av á-priser",
      info:"Dokumentera i dagboken. Samla alla ÄTA- och hinderrelaterade dokument i EPSUS.",
      punkter:[
        {n:"orsak", t:"Orsaken till ökade kostnader är fastställd", h:"Myndighetsbeslut, krig eller katastrof, onormala prisförändringar, ÄTA, hinder, eller ändrad omfattning"},
        {n:"kalkyl", t:"Bedömt om de förändrade priserna gör att kalkylen inte håller"},
        {n:"underr", t:"Skriftlig underrättelse skickad till beställaren om att One vill omförhandla priserna", h:"Skicka underrättelse även om kalkylen håller"},
        {n:"ata", t:"Klarlagt hur ÄTA ska ersättas enligt kontraktet", h:"Löpande räkning, avtalad á-prislista, mängdförteckning — eller inget avtalat, då gäller självkostnadsprincipen"},
        {n:"grans", t:"Kontrollerat 25 %- och 0,5 %-gränsen per enskilt á-pris (kap. 6 § 6)", h:"Använd á-priskontrollen under Ekonomi"},
        {n:"sag", t:"Skriftlig uppsägning av á-priser skickad och sparad på SharePoint, om gränsen passerats"},
        {n:"forut", t:"Bedömt om tillkommande eller avgående arbete skett under helt andra förutsättningar än när á-priserna lämnades"} ] },
    { namn:"Hinder",
      info:"Utan underrättelse finns ingen rätt till ersättning.",
      punkter:[
        {n:"hbero", t:"Fastställt att hindret beror på beställaren eller någon på beställarens sida"},
        {n:"hunderr", t:"Beställaren underrättad med Underrättelse om störning, sparad på SharePoint"},
        {n:"hkost", t:"Noggrann dokumentation förd över kostnaderna till följd av hindret, och fakturering gjord"} ] },
    { namn:"Väsentlig rubbning",
      info:"Exempel: ÄTA leder till att entreprenaden måste färdigställas under en helt annan årstid, eller kräver en betydligt större arbetsinsats av projektledaren.",
      punkter:[
        {n:"vrub", t:"Skriftlig underrättelse skickad om att väsentlig rubbning är aktuell och att ökade kostnader kommer att krävas ersatta"},
        {n:"vblank", t:"Blankett Dokumentera påverkan på arbeten ifylld och sparad på SharePoint"} ] } ] },

  { id:"2.6", titel:"Om One och avtalspart inte kommer överens", kalla:"2.6 (ONE Nordic)", grupper:[
    { namn:"Omedelbara åtgärder",
      info:"Kontakta Ones jurist så snart som möjligt.",
      punkter:[
        {n:"skrift", t:"All kommunikation med avtalsparten sker skriftligen — inget besvaras per telefon"},
        {n:"spara", t:"All kommunikation mellan One och beställaren sparas på Ones SharePoint"},
        {n:"jurist", t:"Ones jurist kontaktad"} ] },
    { namn:"Handlingar till juristen",
      punkter:[
        {n:"h1", t:"Avtal"},
        {n:"h2", t:"AF-del"},
        {n:"h3", t:"Relevanta bilagor, exempelvis allmänna villkor"},
        {n:"h4", t:"Relevanta mejl, brev, sms och anteckningar mellan One och beställaren"},
        {n:"h5", t:"Eventuell beställning/avrop och beställningsbekräftelse"},
        {n:"h6", t:"Offert"} ] } ] },

  { id:"3.1", titel:"Att slutföra entreprenaden", kalla:"3.1 (ONE Nordic)", grupper:[
    { namn:"Kalla till besiktning",
      info:"Vill beställaren börja använda en del av entreprenaden innan helheten är klar kan ni begära slutbesiktning av just den delen.",
      punkter:[
        {n:"klart", t:"Samtliga kontraktsarbeten och ÄTA-arbeten är utförda och all dokumentation färdigställd"},
        {n:"anmal", t:"Skriftlig anmälan skickad till beställaren om när entreprenaden beräknas färdig för slutbesiktning, sparad på SharePoint"},
        {n:"bmutse", t:"Kontrollerat i kontraktet om One eller beställaren utser besiktningsman", h:"Utser beställaren ingen har One rätt att göra det — meddela skriftligt"},
        {n:"kallelse", t:"Kallelsen innehåller datum och tid, plats, beskrivning av vad som ska besiktigas och vilka parter som förväntas delta"},
        {n:"svar", t:"One har skriftligen svarat besiktningsmannen att One närvarar, och deltagarna har bokat in det"},
        {n:"2v", t:"Besiktningsdatum satt inom 2–3 veckor från Ones anmälan", h:"Sker ingen slutbesiktning anses entreprenaden avlämnad från den tidpunkt då den skulle ha skett — meddela beställaren skriftligt att garantitiden börjat löpa"} ] },
    { namn:"Besiktningsutlåtandet",
      punkter:[
        {n:"3v", t:"Besiktningsutlåtandet mottaget inom 3 veckor efter besiktningen"},
        {n:"godk", t:"Entreprenaden bedömdes godkänd vid slutsammanträdet", h:"Godkänd entreprenad anses avlämnad kl. 24.00 samma dag som slutsammanträdet hålls"} ] },
    { namn:"Fel och anmärkningar",
      punkter:[
        {n:"yttra", t:"One fick möjlighet att yttra sig över felen innan de antecknades", h:"Fel får inte antecknas utan att ni först fått yttra er"},
        {n:"avhjalp", t:"Felen avhjälpta utan dröjsmål"},
        {n:"efter", t:"Entreprenaden skriftligen anmäld till efterbesiktning"},
        {n:"overens", t:"Alternativt: skriftlig överenskommelse med beställaren om att felen är avhjälpta, undertecknad av båda och sparad"},
        {n:"over", t:"Vid oenighet om fel: överbesiktning eller prisavdrag diskuterat med Ones jurist"} ] },
    { namn:"Ekonomi vid avslut",
      punkter:[
        {n:"sak", t:"Säkerheten för entreprenaden nedsatt efter godkänd slutbesiktning"},
        {n:"handl", t:"Kontraktet läst för att inte missa handlingar som ska bifogas fakturorna"},
        {n:"alla", t:"Samtliga fakturor skickade till beställaren"},
        {n:"atafak", t:"Samtliga ÄTA-fakturor kontrollerade och skickade"} ] },
    { namn:"Slutavräkning",
      info:"Är värdet av avgående arbeten större än tillkommande har One rätt till 10 % av mellanskillnaden. Överstiger mellanskillnaden 20 % av kontraktssumman tillkommer rimlig ersättning för utebliven vinst på det överskjutande beloppet. Använd slutavräkningen under Ekonomi.",
      punkter:[
        {n:"berak", t:"Slutavräkning beräknad och kontrollerad mot 10 %- och 20 %-reglerna"},
        {n:"fakt", t:"Slutfaktura skickad enligt kontraktet"} ] } ] },

  { id:"VC", titel:"Veckochecklistan — projektledarens checklista", kalla:"Projektledarens checklista (ONE Nordic)",
    lank:["vecka","Öppna Veckokoll"],
    ingress:"Checklistan ska gås igenom av projektledaren varje vecka för varje kontrakt som projektledaren driver. "+
      "Projektledaren har skyldighet att vidta åtgärd om något av svaren ger anledning till det. "+
      "Själva veckogenomgången görs i fliken Veckokoll, som loggar svar och flaggor vecka för vecka — "+
      "det här kapitlet är referensen till vad varje fråga innebär.",
    grupper:[
    { namn:"1. Vet jag vad som ingår i kontraktet?", text:[
      "Ja → Är du säker? Läs kontraktet igen och säkerställ vilket arbete ni ska utföra.",
      "Nej → Läs kontraktet och säkerställ att du och andra i projektet vet vilket arbete som ska göras."
    ] },
    { namn:"2. Har det hänt något oförutsett denna vecka som vi inte räknade med vid anbud?", text:[
      "Ja → Kan innebära ändrad förutsättning enligt AB 04/ABT 06 kap. 1 § 7. Kan även innebära hinder och/eller ÄTA-arbete — underrätta beställaren skriftligen.",
      "Nej → Är du säker? Om ja, ingen åtgärd.",
      "Osäker → Kontrollera med övrig personal. Rådfråga eventuellt jurist."
    ] },
    { namn:"3. Har det tillkommit arbete?", text:[
      "Ja → Ingår det i kontraktet? Om ja, ingen åtgärd. Om nej, kan det innebära ÄTA-arbete som ska aviseras — gå vidare till fråga 4.",
      "Nej → Ingen åtgärd."
    ] },
    { namn:"4. Har vi skriftlig beställning eller underrättelse för arbete utanför kontraktsåtagandet?", text:[
      "Ja → Ingen åtgärd.",
      "Nej → Underrätta beställaren skriftligen om ÄTA-arbete."
    ] },
    { namn:"5. Har allt arbete enligt tidplan kunnat utföras utan väntan eller uppskjutning?", text:[
      "Jämför AB 04/ABT 06 kap. 4 § 3.",
      "Ja → Ingen åtgärd.",
      "Nej → Underrätta beställaren skriftligen om hinder. Beror hindret på beställaren eller något förhållande på beställarens sida finns även rätt till hinderersättning enligt kap. 5 § 4 — i annat fall enbart rätt till tidsförlängning.",
      "Osäker → Kontrollera med övrig personal. Rådfråga eventuellt jurist."
    ] },
    { namn:"6. Har leverantörerna aviserat prisförändringar?", text:[
      "Ja → Vid stor kostnadspåverkan ska prisjustering aviseras enligt AB 04/ABT 06 kap. 6 § 3.",
      "Nej → Ingen åtgärd.",
      "Osäker → Kontrollera med övrig personal. Rådfråga eventuellt jurist."
    ] },
    { namn:"7. Har beställaren beställt eller avbeställt en större volym arbeten?", text:[
      "Ja → Se fråga 8.",
      "Nej → Ingen åtgärd.",
      "Osäker → Kontrollera med övrig personal. Rådfråga eventuellt jurist."
    ] },
    { namn:"8. Har volymen ökat eller minskat med 25 %?", text:[
      "Jämför AB 04/ABT 06 kap. 6 § 6. Gäller för varje enskilt á-pris.",
      "Ja → Anmäl skriftligen till beställaren att á-priset inte längre gäller och påkalla förhandling om nytt á-pris. Nås ingen överenskommelse tillämpas självkostnadsprincipen.",
      "Nej → Ingen åtgärd.",
      "Räkneexempel: kontraktssumma 1 MSEK, 600 kvm arbete till á-pris 20 kr/kvm. Beställaren föreskriver 400 kvm tilläggsarbete — en ökning med drygt 66 %. Värdet 8 000 kr överstiger 0,5 % av kontraktssumman (5 000 kr). Följden är att á-priset bara gäller för 250 kvm tillkommande arbete; för överskjutande kvantitet gäller det inte."
    ] },
    { namn:"9. Innehåller dagböckerna specifikation av utfört arbete och tidsåtgång?", text:[
      "Ja → Ingen åtgärd.",
      "Nej → Justera, lägg till eller ändra i dagboken."
    ] } ] }
];
