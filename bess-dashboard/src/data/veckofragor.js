/* VECKOFRAGOR — grunddata extraherad ur standalone-filen.
   Rör inte logiken: detta är ren data. */

export const VECKOFRAGOR = [
  { n:1, fraga:"Vet jag vad som ingår i kontraktet?",
    alt:["ja","nej"], flagga:["nej"],
    svar:{ ja:"Är du säker? Läs kontraktet igen och säkerställ vilket arbete ni ska utföra.",
           nej:"Läs kontraktet och säkerställ att du och andra i projektet vet vilket arbete som ska göras." } },

  { n:2, fraga:"Har det hänt något oförutsett i projektet denna vecka som vi inte hade räknat med när vi lämnade anbud?",
    alt:["ja","nej","osaker"], flagga:["ja","osaker"], ref:"AB 04/ABT 06 kap. 1 § 7",
    svar:{ ja:"Kan innebära en ändrad förutsättning. Kan även innebära hinder och/eller ÄTA-arbete — underrätta beställaren skriftligen om ÄTA/hinder.",
           nej:"Är du säker? Om ja, ingen åtgärd.",
           osaker:"Kontrollera med övrig personal. Rådfråga vid behov Ones jurist." } },

  { n:3, fraga:"Har det tillkommit arbete?",
    alt:["ja","nej"], flagga:["ja"],
    svar:{ ja:"Ingår det i kontraktet? Om ja, ingen åtgärd. Om nej — kan innebära ÄTA-arbete som ska aviseras. Se fråga 4.",
           nej:"Ingen åtgärd." } },

  { n:4, fraga:"Om vi har utfört arbete som inte ingår i kontraktsåtagandet — har vi fått skriftlig beställning från beställaren eller skriftligen underrättat om ÄTA-arbete?",
    alt:["ja","nej"], flagga:["nej"],
    svar:{ ja:"Ingen åtgärd.",
           nej:"Underrätta beställaren skriftligen om ÄTA-arbete." } },

  { n:5, fraga:"Har allt arbete som enligt tidplan/avrop skulle utföras denna vecka kunnat utföras utan att vi behövt vänta eller skjuta upp visst arbete?",
    alt:["ja","nej","osaker"], flagga:["nej","osaker"], ref:"AB 04/ABT 06 kap. 4 § 3 · hinderersättning kap. 5 § 4",
    svar:{ ja:"Ingen åtgärd.",
           nej:"Underrätta beställaren skriftligen om hinder. Beror hindret på beställaren eller något förhållande på beställarens sida har ni även rätt till hinderersättning. I annat fall enbart rätt till tidsförlängning.",
           osaker:"Kontrollera med övrig personal. Rådfråga vid behov Ones jurist." } },

  { n:6, fraga:"Har leverantörerna aviserat prisförändringar?",
    alt:["ja","nej","osaker"], flagga:["ja","osaker"], ref:"AB 04/ABT 06 kap. 6 § 3",
    svar:{ ja:"Vid stor kostnadspåverkan ska ni avisera om prisjustering.",
           nej:"Ingen åtgärd.",
           osaker:"Kontrollera med övrig personal. Rådfråga vid behov Ones jurist." } },

  { n:7, fraga:"Har beställaren beställt eller ”avbeställt” en större volym arbeten?",
    alt:["ja","nej","osaker"], flagga:["ja","osaker"],
    svar:{ ja:"Gå vidare till fråga 8 och kontrollera volymgränsen.",
           nej:"Ingen åtgärd.",
           osaker:"Kontrollera med övrig personal. Rådfråga vid behov Ones jurist." } },

  { n:8, fraga:"Har volymen ökat eller minskat med 25 %?",
    alt:["ja","nej","osaker"], flagga:["ja","osaker"], ref:"AB 04/ABT 06 kap. 6 § 6",
    svar:{ ja:"Anmäl skriftligen till beställaren att á-priset inte längre gäller och påkalla förhandling om nytt á-pris. Nås ingen överenskommelse tillämpas självkostnadsprincipen (löpande räkning). Använd á-priskontrollen under Ekonomi.",
           nej:"Ingen åtgärd.",
           osaker:"Räkna i á-priskontrollen under Ekonomi. Rådfråga vid behov Ones jurist." } },

  { n:9, fraga:"Har du kontrollerat att dagböckerna innehåller specifikation av utfört arbete och tidsåtgång?",
    alt:["ja","nej"], flagga:["nej"],
    svar:{ ja:"Ingen åtgärd.",
           nej:"Justera, lägg till eller ändra i dagboken." } }
];
