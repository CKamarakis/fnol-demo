import { $ } from '../core/dom.jsx';
import { esc } from '../core/utils.js';

/* ==================================================================
   §5 INLINE SVG GRAPHICS — all hand-authored. No tiles, no images.
   ================================================================== */

/* A schematic road/map. Deliberately NOT a real map: a real map needs
   tiles, tiles need a network, and this must work on a plane. It reads
   as "we know where you are" without pretending to be Google Maps. */
export function svgMap(sc, draggable){
  const t=sc.telematics;
  const theft = sc.type==="theft";
  return `<svg viewBox="0 0 350 168" width="100%" height="auto" role="img" aria-label="Schematic map of ${esc(t.location)}" style="display:block;background:#eef3f7">
    <defs>
      <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
        <path d="M26 0H0V26" fill="none" stroke="#e7edf3" stroke-width="1"/>
      </pattern>
      <radialGradient id="glow"><stop offset="0%" stop-color="#2A453D" stop-opacity=".42"/><stop offset="100%" stop-color="#2A453D" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="350" height="168" fill="url(#grid)"/>
    <!-- minor roads -->
    <path d="M0 34 H350 M0 138 H350" stroke="#e2eaf1" stroke-width="6" fill="none"/>
    <path d="M74 0 V168 M268 0 V168" stroke="#e2eaf1" stroke-width="5" fill="none"/>
    <!-- the autobahn -->
    <path d="M-10 118 C 70 112, 120 92, 190 78 S 300 56, 362 44" stroke="#c2cfd9" stroke-width="21" fill="none" stroke-linecap="round"/>
    <path d="M-10 118 C 70 112, 120 92, 190 78 S 300 56, 362 44" stroke="#a9bcc9" stroke-width="17" fill="none" stroke-linecap="round"/>
    <path d="M-10 118 C 70 112, 120 92, 190 78 S 300 56, 362 44" stroke="#64786f" stroke-width="1.6" fill="none" stroke-dasharray="11 13" opacity=".65"/>
    <!-- road shield -->
    <g transform="translate(30,128)">
      <rect x="0" y="0" width="30" height="17" rx="4" fill="#2A453D" stroke="#2A453D" stroke-width="1"/>
      <text x="15" y="12.4" font-family="system-ui" font-size="10.5" font-weight="700" fill="#dbe7e1" text-anchor="middle">${theft?"A10":sc.type==="glass"?"B1":"A2"}</text>
    </g>
    <text x="300" y="150" font-family="system-ui" font-size="9" fill="#8b9daa" text-anchor="end">schematic — no tiles</text>
    <!-- pin -->
    <circle cx="196" cy="76" r="40" fill="url(#glow)"/>
    <g transform="translate(196,76)">
      ${theft?`
      <circle r="9" fill="none" stroke="#9a6410" stroke-width="2" stroke-dasharray="4 3"/>
      <circle r="3" fill="#9a6410"/>
      <circle r="20" fill="none" stroke="#9a6410" stroke-width="1" opacity=".35"/>
      <text y="-16" font-family="system-ui" font-size="8.5" fill="#9a6410" text-anchor="middle" font-weight="700">LAST PING 03:47</text>
      `:`
      <path d="M0 6 C -9 -4 -12 -9 -12 -14 A12 12 0 1 1 12 -14 C 12 -9 9 -4 0 6 Z" fill="#2A453D" stroke="#F1F5F9" stroke-width="1.6"/>
      <circle cy="-14" r="4.4" fill="#F1F5F9"/>
      `}
    </g>
    ${draggable?`<text x="196" y="112" font-family="system-ui" font-size="9.5" fill="#64786f" text-anchor="middle">drag to correct</text>`:""}
  </svg>`;
}

/* Photo silhouette overlays — the guided sequence. */
export function svgSilhouette(kind, taken){
  const stroke = taken ? "#1f7a5a" : "#3d4c5e";
  const op = taken ? ".9" : ".62";
  const body = {
    wide:`<path d="M14 60 h96 M20 46 q8 -12 22 -12 h20 q10 0 16 8 l8 10" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <rect x="24" y="34" width="34" height="16" rx="3" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <rect x="70" y="30" width="42" height="22" rx="3" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <circle cx="34" cy="54" r="5" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <circle cx="52" cy="54" r="5" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <circle cx="80" cy="54" r="5" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <circle cx="102" cy="54" r="5" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>`,
    damage:`<path d="M30 24 h64 q8 0 8 8 v30 q0 8 -8 8 h-64 q-8 0 -8 -8 v-30 q0 -8 8 -8 z" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <path d="M42 34 l10 12 l-7 3 l12 12 l-4 -11 l8 -2 z" stroke="#EE6B54" stroke-width="1.7" fill="none" opacity=".85"/>
          <path d="M64 40 q10 4 16 14" stroke="#EE6B54" stroke-width="1.5" fill="none" opacity=".7"/>
          <circle cx="62" cy="46" r="26" stroke="${stroke}" stroke-width="1" stroke-dasharray="4 4" fill="none" opacity=".5"/>`,
    plate:`<rect x="22" y="28" width="80" height="38" rx="4" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <rect x="34" y="40" width="56" height="16" rx="2.5" stroke="${stroke}" stroke-width="1.8" fill="none"/>
          <rect x="34" y="40" width="8" height="16" rx="2.5" fill="${stroke}" opacity=".4"/>
          <path d="M48 45 h2 M54 45 h2 M62 45 h2 M70 45 h2 M78 45 h2" stroke="${stroke}" stroke-width="2.4" opacity=".8"/>`,
    sign:`<path d="M62 70 V38" stroke="${stroke}" stroke-width="2" opacity="${op}"/>
          <path d="M62 12 L82 34 L62 56 L42 34 Z" stroke="${stroke}" stroke-width="1.7" fill="none" opacity="${op}"/>
          <path d="M56 34 h12 M62 28 v12" stroke="${stroke}" stroke-width="1.7" opacity="${op}"/>
          <path d="M16 68 h92" stroke="${stroke}" stroke-width="1.4" stroke-dasharray="9 7" opacity=".55"/>`,
    doc:`<path d="M40 16 h34 l14 14 v46 q0 4 -4 4 h-44 q-4 0 -4 -4 v-56 q0 -4 4 -4 z" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <path d="M74 16 v14 h14" stroke="${stroke}" stroke-width="1.6" fill="none" opacity="${op}"/>
          <path d="M44 42 h32 M44 50 h32 M44 58 h20" stroke="${stroke}" stroke-width="1.5" opacity=".72"/>`,
  }[kind] || "";
  return `<svg class="psvg" viewBox="0 0 124 84" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${body}</svg>`;
}

/* Point-of-impact marker: a truck outline you tap. EAS box 10. */
export function svgImpact(sel){
  const pts=[
    {id:"front_left",  x:52,  y:26,  l:"Front left"},
    {id:"front",       x:82,  y:20,  l:"Front"},
    {id:"front_right", x:112, y:26,  l:"Front right"},
    {id:"side_left",   x:40,  y:74,  l:"Left side"},
    {id:"side_right",  x:124, y:74,  l:"Right side"},
    {id:"rear_left",   x:52,  y:126, l:"Rear left"},
    {id:"rear",        x:82,  y:134, l:"Rear"},
    {id:"rear_right",  x:112, y:126, l:"Rear right"},
    {id:"roof",        x:82,  y:74,  l:"Roof / load"},
  ];
  return `<svg viewBox="0 0 164 156" width="100%" height="auto" role="group" aria-label="Point of impact">
    <!-- tractor unit -->
    <path d="M56 12 q0 -6 6 -6 h40 q6 0 6 6 v24 h-52 z" fill="#e7edf3" stroke="#a9bcc9" stroke-width="1.6"/>
    <path d="M62 14 h40 v14 h-40 z" fill="#eef3f7" stroke="#c2cfd9" stroke-width="1.2"/>
    <!-- trailer -->
    <rect x="50" y="38" width="64" height="102" rx="5" fill="#e7edf3" stroke="#a9bcc9" stroke-width="1.6"/>
    <path d="M50 62 h64 M50 90 h64 M50 116 h64" stroke="#c8d4de" stroke-width="1.1"/>
    <!-- wheels -->
    <rect x="42" y="44" width="9" height="17" rx="3" fill="#c8d4de"/><rect x="113" y="44" width="9" height="17" rx="3" fill="#c8d4de"/>
    <rect x="42" y="106" width="9" height="17" rx="3" fill="#c8d4de"/><rect x="113" y="106" width="9" height="17" rx="3" fill="#c8d4de"/>
    <rect x="42" y="124" width="9" height="17" rx="3" fill="#c8d4de"/><rect x="113" y="124" width="9" height="17" rx="3" fill="#c8d4de"/>
    <text x="82" y="152" font-family="system-ui" font-size="8.5" fill="#8b9daa" text-anchor="middle">tap the point of impact</text>
    ${pts.map(p=>{
      const on = sel===p.id;
      return `<g class="impact-pt" data-act="impact" data-id="${p.id}" style="cursor:pointer">
        <circle cx="${p.x}" cy="${p.y}" r="13" fill="transparent"/>
        <circle cx="${p.x}" cy="${p.y}" r="${on?9:6.5}" fill="${on?"#EE6B54":"#F1F5F9"}" stroke="${on?"#b8341c":"#4a5b6e"}" stroke-width="${on?2:1.5}"/>
        ${on?`<circle cx="${p.x}" cy="${p.y}" r="15" fill="none" stroke="#EE6B54" stroke-width="1.4" opacity=".5"/>`:""}
      </g>`;
    }).join("")}
  </svg>`;
}
export const IMPACT_LABEL = {front_left:"Front left",front:"Front",front_right:"Front right",side_left:"Left side",
  side_right:"Right side",rear_left:"Rear left",rear:"Rear",rear_right:"Rear right",roof:"Roof / load"};

/* small ring gauge for the soft-stop screen */
export function svgRing(pct){
  const r=34, c=2*Math.PI*r;
  return `<svg viewBox="0 0 78 78" class="ring" aria-hidden="true">
    <circle cx="39" cy="39" r="${r}" fill="none" stroke="#dde5ec" stroke-width="6"/>
    <circle cx="39" cy="39" r="${r}" fill="none" stroke="#1f7a5a" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c*(1-pct/100)}" transform="rotate(-90 39 39)"/>
    <path d="M27 39 l8 9 l17 -19" fill="none" stroke="#1f7a5a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}


