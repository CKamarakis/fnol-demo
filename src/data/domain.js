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

/* Minimal i18n. Five languages, real strings on the load-bearing screens.
   Cross-border freight means the driver may be Polish in Germany —
   the language switch is on screen one, not buried in settings. */
/* Ordered by language code, so the dropdown reads alphabetically without the
   render having to sort it. English is the source text, not the first entry. */
export const STR = {
  de:{
    lang:"Deutsch", detected:"Erkannt", ok:"Sind alle wohlauf?",
    fine:"Alles in Ordnung", hurt:"Jemand ist verletzt", dismiss:"Kein Unfall. Etwas anderes melden",
    already:"Was der Lkw gemeldet hat", today:"heute",
    call112:"112 anrufen", emgCta:"Notruf 112", emgTitle:"Sicherheit zuerst", emgSub:"Der Schaden ist jetzt nicht wichtig.",
    emgBody:"Wenn jemand verletzt ist, ruf jetzt den Notruf. Diese Meldung wartet auf dich. Nichts geht verloren.",
    emgCalled:"Angerufen, weiter", emgNoNeed:"Kein Rettungswagen nötig, weiter",
    tier1:"Daten des Trackers prüfen", tier1sub:"Tippe jeden Punkt an, um ihn zu bestätigen oder zu korrigieren.",
    stillToCheck:"noch zu prüfen", allChecked:"Alles geprüft", seekHint:"Tippen, wir springen hin",
    submit:"Bestätigen", six:"6 von 6 · mehr blockiert dich nicht",
    refTitle:"Erfasst. Schadennummer vergeben.", saved:"Gespeichert",
    skip:"Überspringen, später erledigen", contin:"Weiter", perish:"Was verschwindet, wenn wir warten",
    blockPath:"Pflichtangaben", elapsed:"vergangen",
  },
  en:{
    lang:"English", detected:"Detected", ok:"Is everyone okay?",
    fine:"Everyone's fine", hurt:"Someone is hurt", dismiss:"Not an incident. Report something else",
    already:"Reported information", today:"today",
    call112:"Call 112", emgCta:"Emergency 112", emgTitle:"Safety first", emgSub:"Nothing about the claim matters yet.",
    emgBody:"If anyone is injured, call the emergency number now. This report waits for you. Nothing you entered is lost.",
    emgCalled:"I've called, continue", emgNoNeed:"No ambulance needed, continue",
    tier1:"Verify the tracker's data", tier1sub:"Tap each item to confirm or correct its value.",
    stillToCheck:"still to check", allChecked:"All checked", seekHint:"Tap to jump there",
    submit:"Confirm", six:"6 of 6 · nothing else blocks you",
    refTitle:"You're covered. Reference issued.", saved:"Saved",
    skip:"Skip, I'll do this later", contin:"Continue", perish:"Things that disappear if we wait",
    blockPath:"Blocking path", elapsed:"elapsed",
  },
  /* French and Dutch: the Benelux and France corridors carry the same trucks as
     the German ones, and the European Accident Statement is a French document
     to begin with — the constat amiable. */
  fr:{
    lang:"Français", detected:"Détecté", ok:"Tout le monde va bien ?",
    fine:"Tout le monde va bien", hurt:"Quelqu'un est blessé", dismiss:"Pas un accident. Signaler autre chose",
    already:"Informations transmises", today:"aujourd'hui",
    call112:"Appeler le 112", emgCta:"Urgence 112", emgTitle:"La sécurité d'abord", emgSub:"Le sinistre n'a aucune importance pour l'instant.",
    emgBody:"Si quelqu'un est blessé, appelle les secours maintenant. Cette déclaration t'attend. Rien de ce que tu as saisi n'est perdu.",
    emgCalled:"J'ai appelé, continuer", emgNoNeed:"Pas besoin d'ambulance, continuer",
    tier1:"Vérifier les données du boîtier", tier1sub:"Touche chaque élément pour confirmer ou corriger sa valeur.",
    stillToCheck:"encore à vérifier", allChecked:"Tout est vérifié", seekHint:"Toucher pour y aller",
    submit:"Confirmer", six:"6 sur 6 · rien d'autre ne te bloque",
    refTitle:"Déclaration reçue. Référence attribuée.", saved:"Enregistré",
    skip:"Passer, je le ferai plus tard", contin:"Continuer", perish:"Ce qui disparaît si nous attendons",
    blockPath:"Champs obligatoires", elapsed:"écoulé",
  },
  nl:{
    lang:"Nederlands", detected:"Gedetecteerd", ok:"Is iedereen in orde?",
    fine:"Iedereen is in orde", hurt:"Er is iemand gewond", dismiss:"Geen incident. Iets anders melden",
    already:"Doorgegeven gegevens", today:"vandaag",
    call112:"Bel 112", emgCta:"Noodgeval 112", emgTitle:"Veiligheid eerst", emgSub:"De schade doet er nu even niet toe.",
    emgBody:"Als er iemand gewond is, bel dan nu het alarmnummer. Deze melding wacht op je. Niets van wat je hebt ingevuld gaat verloren.",
    emgCalled:"Ik heb gebeld, verder", emgNoNeed:"Geen ambulance nodig, verder",
    tier1:"Gegevens van de tracker controleren", tier1sub:"Tik op elk item om de waarde te bevestigen of te corrigeren.",
    stillToCheck:"nog te controleren", allChecked:"Alles gecontroleerd", seekHint:"Tik om er te komen",
    submit:"Bevestigen", six:"6 van 6 · niets anders houdt je tegen",
    refTitle:"Ontvangen. Referentie toegekend.", saved:"Opgeslagen",
    skip:"Overslaan, ik doe dit later", contin:"Verder", perish:"Wat verdwijnt als we wachten",
    blockPath:"Verplichte velden", elapsed:"verstreken",
  },
  pl:{
    lang:"Polski", detected:"Wykryto", ok:"Czy wszyscy są cali?",
    fine:"Wszystko w porządku", hurt:"Ktoś jest ranny", dismiss:"To nie zdarzenie. Zgłoś co innego",
    already:"Co zgłosiła ciężarówka", today:"dzisiaj",
    call112:"Zadzwoń 112", emgCta:"Alarmowy 112", emgTitle:"Najpierw bezpieczeństwo", emgSub:"Szkoda może poczekać.",
    emgBody:"Jeśli ktoś jest ranny, zadzwoń teraz pod numer alarmowy. Zgłoszenie poczeka. Nic nie zostanie utracone.",
    emgCalled:"Zadzwoniłem, dalej", emgNoNeed:"Karetka niepotrzebna, dalej",
    tier1:"Sprawdź dane z nadajnika", tier1sub:"Dotknij każdej pozycji, aby ją potwierdzić lub poprawić.",
    stillToCheck:"do sprawdzenia", allChecked:"Wszystko sprawdzone", seekHint:"Dotknij, aby przejść",
    submit:"Potwierdź", six:"6 z 6 · nic więcej nie blokuje",
    refTitle:"Zgłoszone. Numer szkody nadany.", saved:"Zapisano",
    skip:"Pomiń, zrobię to później", contin:"Dalej", perish:"To, co zniknie, jeśli poczekamy",
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
    id:"glass", label:"Glass, single vehicle", short:"Glass",
    type:"glass", fieldCount:8, thirdParty:false, eas:false, photos:["wide","damage"],
    telematics:{
      ...fromMapon(MAPON_FIXTURES.glass),
      location:"B1 near Brandenburg an der Havel, Brandenburg, Germany",
      speed:"84 km/h · no deceleration event",
      impact:"no alert fired · below every Mapon threshold",
      inferred:"glass",
    },
    /* The headline splits: a kicker naming what the system did, then the
       subject it did it to. "Detected" is the system's claim and stays small;
       the damage is what the driver needs to read first. The kicker comes from
       T('detected'); the subject is per-language here, so every language gets
       the same two-part shape rather than one long sentence. */
    headline:{
      de:"Scheibenschaden", en:"Windscreen damage", fr:"Bris de pare-brise",
      nl:"Ruitschade", pl:"Uszkodzenie szyby",
    },
    perishable:["photos"],
    note:"Single-vehicle glass. No EAS — there is no other party to agree facts with. Eight fields, two screens, done.",
  },
  collision:{
    id:"collision", label:"Collision, multi-party + injury", short:"Collision",
    type:"collision", fieldCount:41, thirdParty:true, eas:true,
    photos:["wide","damage","other","signage","docs"],
    telematics:{
      ...fromMapon(MAPON_FIXTURES.collision),
      inferred:"collision",
    },
    headline:{
      de:"Möglicher Unfall", en:"Possible collision", fr:"Collision possible",
      nl:"Mogelijke aanrijding", pl:"Możliwa kolizja",
    },
    perishable:["witness","otherPlate","photos","eas","police"],
    note:"The full shape. Roughly 41 capturable fields — six of them block. The other 35 are ordered by how fast they evaporate.",
  },
  theft:{
    id:"theft", label:"Theft, vehicle gone", short:"Theft",
    type:"theft", fieldCount:14, thirdParty:false, eas:false, photos:["scene_empty","signage"],
    // Nothing moved and no recovery was called, so the default photo copy
    // describes an incident that did not happen. What actually perishes here
    // is the parking bay: it fills with another vehicle within the hour, and
    // with it goes the evidence of where the truck stood and what overlooked it.
    perishOverride:{
      photos:{window:"Gone once the bay refills",
        why:"Photos of the empty bay and the signage show the vehicle was here. Another truck parks in it within the hour."},
    },
    telematics:{
      ...fromMapon(MAPON_FIXTURES.theft, {locationNote:"last known position"}),
      time:"03:47", date:"19 August 2026",
      speed:"ignition off 03:47 · unit offline 04:02",
      impact:"no impact event · supply voltage lost",
      clip:"unavailable, unit offline",
      inferred:"theft",
    },
    headline:{
      de:"Keine Fahrzeugdaten mehr", en:"Vehicle telemetry lost",
      fr:"Perte des données du véhicule", nl:"Voertuiggegevens verloren",
      pl:"Utracono dane pojazdu",
    },
    perishable:["police","photos"],
    note:"Theft inverts the ordering. No damage photos exist. The police reference is promoted to near-blocking because no German insurer will progress a theft claim without one, and location falls back to the last telematics ping.",
  },
};

/* --- Perishability model. This ordering is the organising principle
   of the whole form and it is MY recommendation, not an industry
   standard. Ordered by half-life, not by logical grouping. --- */
export const PERISHABLE = {
  witness:    {label:"Witness contact",           window:"Gone in ~10 minutes", half:"minutes",  ord:1, why:"A witness who walks away cannot be found again. A name and a number now is worth more than anything else on this screen."},
  otherPlate: {label:"The other vehicle's plate", window:"Gone when they drive off", half:"minutes", ord:2, why:"From the plate we can find their insurer and everything else. Without it, we cannot."},
  photos:     {label:"Scene photos",              window:"Gone once vehicles move", half:"minutes", ord:3, why:"Photos now show where the vehicles stopped and what the road looked like. Once they move, that is gone."},
  eas:        {label:"Agreed circumstances",      window:"Gone when they leave",    half:"minutes", ord:4, why:"The other driver has to agree these facts while they are still here. Afterwards they cannot."},
  police:     {label:"Police reference",          window:"Hours",                   half:"hours",   ord:5, why:"You can get this later, but the officer is here now and it is one question."},
  cargo:      {label:"Cargo & trailer",           window:"Today",                   half:"today",   ord:6, why:"Only asked because this vehicle carries freight. We can get it from the paperwork later."},
  otherIns:   {label:"Their insurer",             window:"Next week is fine",       half:"cool",    ord:7, why:"We can look this up from the plate, so it is last. Answer it only if the card is in front of you."},
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
  {f:"vehicle.vin",                      a:"ACORD 3 · VIN",   e:"Read from the telematics unit, never typed. Plates are reassigned and mistyped; the VIN is what an appraiser and a salvage buyer key on."},
  {f:"vehicle.drivable",                 a:"ACORD 3 · 38",    e:"Vehicle drivable indicator"},
  {f:"vehicle.damage_description",       a:"ACORD 3 · 37",    e:"Description of damage (DESCRIBE DAMAGE)"},
  {f:"vehicle.where_can_be_seen",        a:"ACORD 3 · WHERE CAN VEH BE SEEN", e:"Where the appraiser will find the vehicle. Asked with the photographs, not in the blocking six."},
  {f:"driver.name",                      a:"ACORD 3 · 33",    e:"Driver name"},
  {f:"driver.licence_number",            a:"ACORD 3 · 34",    e:"Driver's licence number"},
  {f:"injuries[].severity_bands",        a:"ACORD 4 · 43",    e:"Injury description, as bands rather than text (see Art. 9 note). Plural: a group of casualties is rarely one band, and collapsing them sets the reserve from the wrong person."},
  {f:"injuries[].parties",               a:"ACORD 4 · PED / INS VEH / OTH VEH", e:"Which party was hurt. Decides whether this is also a liability notification."},
  {f:"injuries[].emergency_attended",    a:"ACORD 4 · 45",    e:"Ambulance / emergency services attended"},
  {f:"third_parties[].vehicle.plate",    a:"ACORD 5 · 51",    e:"Other vehicle plate"},
  {f:"third_parties[].insured",          a:"ACORD 5 · OTHER VEH/PROP INS?", e:"Whether the other party is insured at all. An uninsured party routes to the national guarantee fund, which a blank policy number cannot express."},
  {f:"third_parties[].insurer_name",     a:"ACORD 5 · 55",    e:"Other party insurer"},
  {f:"third_parties[].policy_number",    a:"ACORD 5 · 56",    e:"Other party policy number"},
  {f:"witnesses[].name / .phone",        a:"ACORD 6 · 61/62", e:"Witness name and contact"},
  {f:"authority.attended",               a:"ACORD 7 · 71",    e:"Police / authority contacted"},
  {f:"authority.reference",              a:"ACORD 7 · 73",    e:"Police report number"},
  {f:"eas.circumstances_a / _b",         a:"— (EAS box 12)",  e:"No ACORD equivalent. Carried as a structured extension; European handlers read it natively."},
  {f:"eas.point_of_impact",              a:"— (EAS box 10)",  e:"No ACORD equivalent. Structured coordinate on vehicle outline."},
  {f:"attachments[]",                    a:"ACORD 8 · 81",    e:"Attached documentation / media"},
];

/* --- What ACORD 2 asks for and this flow deliberately does NOT collect. ---
   A gap nobody explains reads as an oversight. Each of these is a decision,
   and the reason is either "the back office already knows it" or "a driver on
   a hard shoulder is the wrong source". Rendered beside the map, so a
   reviewer sees the omissions as clearly as the coverage. */
export const ACORD_OMITTED = [
  {a:"Policy number, effective / expiration date, agency & sub-code",
   e:"Known from the vehicle. Asking a driver to read a policy number off a document in the cab is asking them to leave the cab."},
  {a:"Insured name & address, SSN, contact preferences",
   e:"The fleet is the insured, not the driver. Held once in the policy record rather than retyped per incident."},
  {a:"Driver's licence number, date of birth, address, relation to insured",
   e:"On file with the fleet and reachable by the handler. Collected at intake it is Art. 5(1)(c) data minimisation with nothing gained — the driver is already identified by the tachograph card."},
  {a:"USED WITH PERMISSION? · PURPOSE OF USE",
   e:"A commercial fleet unit on a tachograph shift answers both. Asking implies the driver might be the problem."},
  {a:"ESTIMATE AMT (own and third-party damage)",
   e:"A driver's guess at a repair cost is worse than no number, and it anchors the reserve. The appraiser produces this."},
  {a:"Injured person's NAME & ADDRESS, PHONE, AGE, EXTENT OF INJURY as free text",
   e:"Art. 9 health data. Presence, severity band, which party and whether help attended is what the reserve and the notification need."},
  {a:"REPORTED BY / REPORTED TO, CAT #, site & location codes",
   e:"Back-office routing the system fills in itself. Every one of these on the driver's screen is a field that is not a question about the accident."},
  // Not omitted from the record — omitted from the QUESTIONS, and only for
  // theft. The values still reach the handler; they are derived rather than
  // asked, and marked as derived so nobody mistakes them for testimony.
  {a:"VEH DRIVABLE? (ACORD 3 · 38) — theft only",
   e:"Derived, not asked. A stolen vehicle is not drivable, and the fact drives the reserve and the credit-hire clock either way. Putting a question with one possible answer to someone who has just lost a truck is a form protecting its own validation rules. Carried to the handler flagged as derived from the incident type."},
  {a:"DESCRIBE DAMAGE · WHERE CAN VEH BE SEEN — theft only",
   e:"Unanswerable while the vehicle is missing: the driver has seen no damage and there is no address to inspect it at. Both are established by whoever recovers the vehicle. Asked in every other scenario."},
];

/* Photo slots — named, with silhouette overlays, not "upload photos" */
export const PHOTO_SLOTS = {
  wide:        {n:1, label:"Wide scene, both vehicles and the road behind", sil:"wide"},
  damage:      {n:2, label:"Damage close-up of your vehicle",          sil:"damage"},
  other:       {n:3, label:"The other vehicle, with the plate in shot",    sil:"plate"},
  signage:     {n:4, label:"Signage & road markings",                 sil:"sign"},
  docs:        {n:5, label:"Their documents, the insurance card",        sil:"doc"},
  scene_empty: {n:1, label:"Where it was parked, the empty space",       sil:"wide"},
};


