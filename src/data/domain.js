import { I } from '../core/utils.js';
import { MAPON_FIXTURES, fromMapon } from './mapon.js';

/* ==================================================================
   §2 DOMAIN DATA
   ================================================================== */

/* --- The European Accident Statement circumstance statements. ---
   Source: the constat amiable européen d'accident automobile /
   Europäischer Unfallbericht, box 12. Standard 17-statement set,
   identical wording both columns (A = our vehicle, B = the other).
   We did not invent a schema: this text is what every European
   handler already reads, and it is agreed WITHOUT admission of liability. */
export const EAS_STATEMENTS = [
  {n:1,  en:"was parked / stopped",                                     de:"parkte / hielt an",                                pl:"parkował / stał"},
  {n:2,  en:"was leaving a parking space / opening a door",             de:"verließ eine Parklücke / öffnete eine Tür",         pl:"wyjeżdżał z miejsca postojowego / otwierał drzwi"},
  {n:3,  en:"was entering a parking space",                             de:"fuhr in eine Parklücke ein",                        pl:"wjeżdżał na miejsce postojowe"},
  {n:4,  en:"was emerging from a car park, private ground, track",      de:"kam aus Parkplatz, Privatgrundstück, Feldweg",       pl:"wyjeżdżał z parkingu, terenu prywatnego, drogi gruntowej"},
  {n:5,  en:"was entering a car park, private ground, track",           de:"fuhr auf Parkplatz, Privatgrundstück, Feldweg",      pl:"wjeżdżał na parking, teren prywatny, drogę gruntową"},
  {n:6,  en:"was entering a roundabout",                                de:"fuhr in einen Kreisverkehr ein",                    pl:"wjeżdżał na rondo"},
  {n:7,  en:"was travelling on a roundabout",                           de:"fuhr im Kreisverkehr",                              pl:"jechał po rondzie"},
  {n:8,  en:"struck the rear of the other vehicle in the same lane",    de:"fuhr auf das andere Fahrzeug in derselben Spur auf", pl:"uderzył w tył drugiego pojazdu na tym samym pasie"},
  {n:9,  en:"was going in the same direction but in a different lane",  de:"fuhr in gleicher Richtung auf anderer Spur",         pl:"jechał w tym samym kierunku innym pasem"},
  {n:10, en:"was changing lanes",                                       de:"wechselte die Fahrspur",                            pl:"zmieniał pas ruchu"},
  {n:11, en:"was overtaking",                                           de:"überholte",                                         pl:"wyprzedzał"},
  {n:12, en:"was turning right",                                        de:"bog nach rechts ab",                                pl:"skręcał w prawo"},
  {n:13, en:"was turning left",                                         de:"bog nach links ab",                                 pl:"skręcał w lewo"},
  {n:14, en:"was reversing",                                            de:"fuhr rückwärts",                                    pl:"cofał"},
  {n:15, en:"encroached on a lane reserved for oncoming traffic",       de:"geriet auf die Gegenfahrbahn",                      pl:"wjechał na pas dla ruchu z naprzeciwka"},
  {n:16, en:"was coming from the right (at an intersection)",           de:"kam von rechts (an einer Kreuzung)",                pl:"nadjeżdżał z prawej strony (na skrzyżowaniu)"},
  {n:17, en:"had not observed a right-of-way or red light sign",        de:"hatte Vorfahrt oder Rotlicht missachtet",           pl:"nie ustąpił pierwszeństwa lub przejechał na czerwonym"},
];

/* Minimal i18n. Three languages, real strings on the load-bearing screens.
   Cross-border freight means the driver may be Polish in Germany —
   the language switch is on screen one, not buried in settings. */
export const STR = {
  en:{
    lang:"English", detected:"We detected an incident", ok:"Is everyone okay?",
    fine:"Everyone's fine", hurt:"Someone is hurt", dismiss:"Not an incident — report something else",
    already:"What the truck reported", today:"today",
    call112:"Call 112", emgCta:"Emergency 112", emgTitle:"Safety first", emgSub:"Nothing about the claim matters yet.",
    emgBody:"If anyone is injured, call the emergency number now. This report will wait for you — nothing you have entered is lost.",
    emgCalled:"I've called — continue", emgNoNeed:"No ambulance needed — continue",
    tier1:"Six things, then you're done", tier1sub:"Nothing else can block you. Everything after this is optional.",
    submit:"Submit report", six:"6 of 6 · nothing else blocks you",
    refTitle:"You're covered. Reference issued.", saved:"Saved",
    skip:"Skip — I'll do this later", contin:"Continue", perish:"Things that disappear if we wait",
    blockPath:"Blocking path", elapsed:"elapsed",
  },
  de:{
    lang:"Deutsch", detected:"Wir haben einen Unfall erkannt", ok:"Sind alle wohlauf?",
    fine:"Alles in Ordnung", hurt:"Jemand ist verletzt", dismiss:"Kein Unfall — etwas anderes melden",
    already:"Was der Lkw gemeldet hat", today:"heute",
    call112:"112 anrufen", emgCta:"Notruf 112", emgTitle:"Sicherheit zuerst", emgSub:"Der Schaden ist jetzt nicht wichtig.",
    emgBody:"Wenn jemand verletzt ist, rufen Sie jetzt den Notruf. Diese Meldung wartet auf Sie — nichts geht verloren.",
    emgCalled:"Angerufen — weiter", emgNoNeed:"Kein Rettungswagen nötig — weiter",
    tier1:"Sechs Angaben, dann sind Sie fertig", tier1sub:"Nichts anderes hält Sie auf. Alles Weitere ist freiwillig.",
    submit:"Meldung absenden", six:"6 von 6 · mehr blockiert Sie nicht",
    refTitle:"Erfasst. Schadennummer vergeben.", saved:"Gespeichert",
    skip:"Überspringen — später erledigen", contin:"Weiter", perish:"Was verschwindet, wenn wir warten",
    blockPath:"Pflichtangaben", elapsed:"vergangen",
  },
  pl:{
    lang:"Polski", detected:"Wykryliśmy zdarzenie", ok:"Czy wszyscy są cali?",
    fine:"Wszystko w porządku", hurt:"Ktoś jest ranny", dismiss:"To nie zdarzenie — zgłoś co innego",
    already:"Co zgłosiła ciężarówka", today:"dzisiaj",
    call112:"Zadzwoń 112", emgCta:"Alarmowy 112", emgTitle:"Najpierw bezpieczeństwo", emgSub:"Szkoda może poczekać.",
    emgBody:"Jeśli ktoś jest ranny, zadzwoń teraz pod numer alarmowy. Zgłoszenie poczeka — nic nie zostanie utracone.",
    emgCalled:"Zadzwoniłem — dalej", emgNoNeed:"Karetka niepotrzebna — dalej",
    tier1:"Sześć rzeczy i gotowe", tier1sub:"Nic więcej Cię nie zatrzyma. Reszta jest opcjonalna.",
    submit:"Wyślij zgłoszenie", six:"6 z 6 · nic więcej nie blokuje",
    refTitle:"Zgłoszone. Numer szkody nadany.", saved:"Zapisano",
    skip:"Pomiń — zrobię to później", contin:"Dalej", perish:"To, co zniknie, jeśli poczekamy",
    blockPath:"Ścieżka obowiązkowa", elapsed:"upłynęło",
  }
};
/* Current-language getter, injected by the store at boot.
   domain.js must not import the store: the store needs SCENARIOS from here,
   and a cycle between them breaks a flattened single-scope bundle. */
let currentLang = () => 'en';
export const setLangSource = fn => { currentLang = fn; };
export const T = k => (STR[currentLang()]||STR.en)[k] || STR.en[k] || k;

/* --- Scenarios. Same form, three shapes. --- */
export const SCENARIOS = {
  glass:{
    id:"glass", label:"Glass — single vehicle", short:"Glass",
    type:"glass", fieldCount:8, thirdParty:false, eas:false, photos:["wide","damage"],
    telematics:{
      ...fromMapon(MAPON_FIXTURES.glass),
      location:"B1 near Brandenburg an der Havel, Brandenburg, Germany",
      speed:"84 km/h · no deceleration event",
      impact:"no alert fired · below every Mapon threshold",
      inferred:"glass",
    },
    headline:"Windscreen damage detected",
    perishable:["photos"],
    note:"Single-vehicle glass. No EAS — there is no other party to agree facts with. Eight fields, two screens, done.",
  },
  collision:{
    id:"collision", label:"Collision — multi-party + injury", short:"Collision",
    type:"collision", fieldCount:41, thirdParty:true, eas:true,
    photos:["wide","damage","other","signage","docs"],
    telematics:{
      ...fromMapon(MAPON_FIXTURES.collision),
      inferred:"collision",
    },
    headline:"We detected an incident",
    perishable:["witness","otherPlate","photos","eas","police"],
    note:"The full shape. Roughly 41 capturable fields — six of them block. The other 35 are ordered by how fast they evaporate.",
  },
  theft:{
    id:"theft", label:"Theft — vehicle gone", short:"Theft",
    type:"theft", fieldCount:14, thirdParty:false, eas:false, photos:["scene_empty","signage"],
    telematics:{
      ...fromMapon(MAPON_FIXTURES.theft, {locationNote:"last known position"}),
      time:"03:47", date:"19 August 2026",
      speed:"ignition off 03:47 · unit offline 04:02",
      impact:"no impact event · supply voltage lost",
      clip:"unavailable — unit offline",
      inferred:"theft",
    },
    headline:"Vehicle telemetry lost",
    perishable:["police","photos"],
    note:"Theft inverts the ordering. No damage photos exist. The police reference is promoted to near-blocking because no German insurer will progress a theft claim without one, and location falls back to the last telematics ping.",
  },
};

/* --- Perishability model. This ordering is the organising principle
   of the whole form and it is MY recommendation, not an industry
   standard. Ordered by half-life, not by logical grouping. --- */
export const PERISHABLE = {
  witness:    {label:"Witness contact",           window:"Gone in ~10 minutes", half:"minutes",  ord:1, why:"A witness who walks away is unreachable forever. Highest value per character typed in the entire form."},
  otherPlate: {label:"The other vehicle's plate", window:"Gone when they drive off", half:"minutes", ord:2, why:"Everything else about the other party can be chased from the plate. The plate cannot be chased from anything."},
  photos:     {label:"Scene photos",              window:"Gone once vehicles move", half:"minutes", ord:3, why:"Position, debris field, skid marks and road conditions are destroyed by the recovery truck."},
  eas:        {label:"Agreed circumstances",      window:"Gone when they leave",    half:"minutes", ord:4, why:"The other driver's agreement to the facts is only obtainable while they are standing there."},
  police:     {label:"Police reference",          window:"Hours",                   half:"hours",   ord:5, why:"Retrievable later, but the officer is here now and it is one question."},
  cargo:      {label:"Cargo & trailer",           window:"Today",                   half:"today",   ord:6, why:"Freight profile only. Reachable from the CMR note and the TMS afterwards."},
  otherIns:   {label:"Their insurer",             window:"Next week is fine",       half:"cool",    ord:7, why:"Derivable from the plate via the central register. Deliberately last — asking for it at the scene costs more than it returns."},
};

/* --- ACORD mapping. The carrier-exchange target made explicit.
   ACORD ACORD1 (Property Loss Notice) / AL (Automobile Loss Notice)
   field numbers, so an insurer's integration lead can check us. --- */
export const ACORD_MAP = [
  {f:"incident.reference",               a:"ACORD 1 · 6",     e:"Insured's claim / file number"},
  {f:"incident.occurred_at",             a:"ACORD 2 · 22",    e:"Date & time of loss"},
  {f:"incident.location.description",    a:"ACORD 2 · 24",    e:"Location of loss"},
  {f:"incident.location.lat / .lon",     a:"ACORD 2 · 24a",   e:"Geocoded loss location (extension)"},
  {f:"incident.type",                    a:"ACORD 2 · 25",    e:"Type of loss"},
  {f:"incident.description",             a:"ACORD 2 · 26",    e:"Description of loss"},
  {f:"vehicle.registration",             a:"ACORD 3 · 31",    e:"Vehicle plate / licence number"},
  {f:"vehicle.drivable",                 a:"ACORD 3 · 38",    e:"Vehicle drivable indicator"},
  {f:"vehicle.damage_description",       a:"ACORD 3 · 37",    e:"Description of damage"},
  {f:"driver.name",                      a:"ACORD 3 · 33",    e:"Driver name"},
  {f:"driver.licence_number",            a:"ACORD 3 · 34",    e:"Driver's licence number"},
  {f:"injuries[].severity_band",         a:"ACORD 4 · 43",    e:"Injury description (band only — see Art. 9 note)"},
  {f:"injuries[].emergency_attended",    a:"ACORD 4 · 45",    e:"Ambulance / emergency services attended"},
  {f:"third_parties[].vehicle.plate",    a:"ACORD 5 · 51",    e:"Other vehicle plate"},
  {f:"third_parties[].insurer_name",     a:"ACORD 5 · 55",    e:"Other party insurer"},
  {f:"third_parties[].policy_number",    a:"ACORD 5 · 56",    e:"Other party policy number"},
  {f:"witnesses[].name / .phone",        a:"ACORD 6 · 61/62", e:"Witness name and contact"},
  {f:"authority.attended",               a:"ACORD 7 · 71",    e:"Police / authority contacted"},
  {f:"authority.reference",              a:"ACORD 7 · 73",    e:"Police report number"},
  {f:"eas.circumstances_a / _b",         a:"— (EAS box 12)",  e:"No ACORD equivalent. Carried as a structured extension; European handlers read it natively."},
  {f:"eas.point_of_impact",              a:"— (EAS box 10)",  e:"No ACORD equivalent. Structured coordinate on vehicle outline."},
  {f:"attachments[]",                    a:"ACORD 8 · 81",    e:"Attached documentation / media"},
];

/* Photo slots — named, with silhouette overlays, not "upload photos" */
export const PHOTO_SLOTS = {
  wide:        {n:1, label:"Wide scene — both vehicles, road behind", sil:"wide"},
  damage:      {n:2, label:"Damage close-up — your vehicle",          sil:"damage"},
  other:       {n:3, label:"The other vehicle — get the plate in",    sil:"plate"},
  signage:     {n:4, label:"Signage & road markings",                 sil:"sign"},
  docs:        {n:5, label:"Their documents — insurance card",        sil:"doc"},
  scene_empty: {n:1, label:"Where it was parked — empty space",       sil:"wide"},
};


