# Buss 2028 – Fellesmøte-appen

## Produktspesifikasjon (PRD)

**Prosjekt:** Diskusjonsapp for fellesmøte mellom foreldre og ungdom i Buss 2028
**Tech stack:** Next.js 14 (App Router) → Vercel, Supabase (Auth + Database + Realtime)
**Språk:** Norsk (bokmål) i all UI-tekst

---

## 1. Produktoversikt

### Hva er dette?

En webapp for strukturerte gruppediskusjoner under et fellesmøte. Foreldre og ungdommer i Buss 2028-prosjektet (25 gutter + deres foreldre) deles inn i grupper som roterer mellom 6 diskusjonsstasjoner. På hver stasjon diskuterer gruppen et tema og legger inn notater i en delt chat. En nedtellingstimer holder samtalen på sporet.

### Kjerneflyt

```
Registrering → Gruppefordeling (admin) → Møtedag: Logg inn → Velg stasjon → 
Sanntidschat med timer → Avslutt stasjon → Velg neste → Admin: Eksporter alt
```

### Nøkkelkrav

- Sanntids gruppechat per stasjon (Supabase Realtime)
- 15 min nedtellingstimer per stasjon per gruppe (starter ved første innlogging)
- Invitasjonsbasert registrering med roller (ungdom/forelder/admin)
- Admin-panel for gruppefordeling og dataeksport
- Mobiloptimalisert (de fleste bruker telefon)
- Norsk brukergrensesnitt

---

## 2. Brukerroller

| Rolle | Beskrivelse | Tilgang |
|-------|-------------|---------|
| **Admin** | Foreldregruppe-organisator (Marius + evt. andre) | Alt: brukeradmin, gruppefordeling, eksport |
| **Ungdom** | De 25 guttene på bussen | Registrering, stasjonschat |
| **Forelder** | Foreldre til ungdommene (1–2+ per ungdom) | Registrering med kobling til barn, stasjonschat |

---

## 3. Registreringsflyt

### 3.1 Fase 1: Ungdommene registrerer seg

**Trigger:** Admin sender ut invitasjonskode til guttene (f.eks. via Telegram/SMS).

**Registreringsskjema:**

| Felt | Type | Validering |
|------|------|------------|
| Invitasjonskode | Tekst | Må matche aktiv kode i `invite_codes`-tabellen |
| Fullt navn | Tekst | Påkrevd, 2–100 tegn |
| E-post | E-post | Påkrevd, unik |
| Passord | Passord | Min. 8 tegn |
| Bekreft passord | Passord | Må matche |

**Flyt:**

1. Bruker åpner app → ser landingsside med "Registrer deg"-knapp
2. Taster inn invitasjonskode → valideres mot `invite_codes`-tabellen
3. Gyldig kode → vis registreringsskjema
4. Ved vellykket registrering → bruker opprettes med rolle `youth` i `profiles`-tabellen
5. Omdirigeres til dashboard som viser "Velkommen! Fellesmøtet har ikke startet ennå."

**Invitasjonskoder:**

- Admin oppretter koder i admin-panelet
- Hver kode har: `code` (unik streng, f.eks. "BUSS2028"), `role` (youth/parent), `is_active` (bool), `max_uses` (int), `uses` (int)
- Separate koder for ungdom og foreldre (fase 1 og 2)
- Koder kan deaktiveres av admin

### 3.2 Fase 2: Foreldrene registrerer seg

**Trigger:** Admin aktiverer foreldrekoden når alle ungdommer er registrert.

**Registreringsskjema (foreldre):**

Samme felter som ungdom, pluss:

| Felt | Type | Validering |
|------|------|------------|
| Jeg er forelder til | Flervalgsliste | Dropdown med alle registrerte ungdommer. Min. 1 valgt. |

**Flyt:**

1. Forelder bruker foreldre-invitasjonskoden
2. Koden er satt med `role = 'parent'`
3. I registreringsskjemaet vises en dropdown med alle registrerte ungdommer (fra `profiles` der `role = 'youth'`)
4. Forelder velger sitt/sine barn (støtter flervalg for foreldre med flere barn på bussen)
5. Koblingen lagres i `parent_youth_links`-tabellen
6. Bruker opprettes med rolle `parent`

### 3.3 Innlogging

Standard e-post/passord-innlogging via Supabase Auth. Etter innlogging rutes brukeren basert på rolle:
- `admin` → Admin-dashboard
- `youth` / `parent` → Deltaker-dashboard

---

## 4. Admin-panel

### 4.1 Brukeroversikt

- Tabell med alle registrerte brukere: navn, e-post, rolle, registreringsdato
- For foreldre: vis koblet ungdom
- Mulighet til å endre rolle (f.eks. gjøre noen til admin)
- Mulighet til å slette bruker

### 4.2 Invitasjonskoder

- Opprett ny kode med: kode-streng, rolle (youth/parent), maks antall bruk
- Vis aktive koder med antall bruk
- Aktiver/deaktiver koder

### 4.3 Gruppefordeling

**Formål:** Fordele alle deltakere (ungdom + foreldre) i diskusjonsgrupper før møtet.

**UI:**

1. Vis liste over alle deltakere (sortert: ungdom først, deretter foreldre med koblet ungdom i parentes)
2. Admin oppretter grupper: "Gruppe 1", "Gruppe 2", etc. (fritt antall, typisk 5–6 grupper à 8–10 personer)
3. Dra-og-slipp eller flervalg → tilordne til gruppe
4. Foreldre tilordnes automatisk til samme gruppe som sitt barn, men admin kan overstyre
5. Vis oversikt: hvilke grupper finnes, hvem er i hver gruppe
6. "Lås grupper"-knapp → frys gruppefordelingen slik at deltakerne kan se sin gruppe

**Datatabell:** `group_members` med `group_id`, `profile_id`

### 4.4 Møtestyring

- **Start møte**: Aktiverer stasjonene slik at deltakerne ser stasjonsvelgeren
- **Avslutt møte**: Deaktiverer alle stasjoner, låser chat
- Møtestatus: `not_started`, `active`, `ended`

### 4.5 Eksport

- **"Eksporter samtaler"**-knapp
- Genererer et Markdown-dokument (.md) med følgende struktur:

```markdown
# Fellesmøte Buss 2028 – Samtalelogg
Dato: [dato]

## Stasjon 1: Fellesskap og samhold

### Gruppe 1
- [Tidspunkt] **Navn** (rolle): Kommentar
- [Tidspunkt] **Navn** (rolle): Kommentar

### Gruppe 2
- [Tidspunkt] **Navn** (rolle): Kommentar

## Stasjon 2: Inkludering og samhold
...
```

- Filen lastes ned som `.md` i nettleseren
- Alle meldinger inkluderes, sortert kronologisk per stasjon per gruppe

---

## 5. Diskusjonsstasjoner

### 5.1 De 6 stasjonene (hardkodet innhold)

Stasjonene har fast innhold som hentes fra en konfigurasjonsfil eller database-seed:

| # | Tittel | Spørsmål |
|---|--------|----------|
| 1 | Fellesskap og samhold | 1. Hva tror dere skal til for at alle 25 på bussen føler seg som én gjeng? 2. Hvilke felles aktiviteter – utenom festing – kan bygge gode relasjoner i gruppen? 3. Hytteturen ble trukket frem som et godt eksempel. Hva gjorde den vellykket, og hva mer kan vi gjøre? 4. Hvordan kan dere løse konflikter underveis uten at noen faller utenfor? |
| 2 | Inkludering og samhold | 1. Hva betyr inkludering for dere – i praksis, ikke bare i ord? 2. Hvordan sikrer vi at buss-prosjektet ikke skaper splittelse blant venner som ikke er med? 3. Har dere opplevd at noen føler seg utenfor allerede? Hva kan gjøres? 4. Hva bør gjelde som spilleregler for hvordan gruppen behandler hverandre? |
| 3 | Forebygging av rus og narkotika | 1. Kontrakten har nulltoleranse for narkotika. Hva tenker dere om den regelen – er den realistisk? 2. Én av fire russ har brukt narkotika det siste året. Hva gjør dere om noen på bussen bryter regelen? 3. Hvordan kan dere passe på hverandre når det gjelder alkohol – uten å bli «politi»? 4. Foreldre: Hva trenger dere å vite for å føle dere trygge? Ungdom: Hva trenger dere fra foreldrene? |
| 4 | Hva kan vi oppnå med budsjettet? | 1. Hva er viktigst for dere å bruke penger på – buss, lyd, lys, klær, eller felles opplevelser? 2. Maks innbetaling er satt til 100 000 kr per person. Hva er et realistisk totalt behov? 3. Hva er dere villige til å gjøre selv (dugnad, egeninnsats) for å spare penger? 4. Hvilke ting kan dere klare dere uten – og hva er «must have»? |
| 5 | Budsjett og finansieringsplan | 1. Hvordan vil dere fordele innbetalingene over 26 måneder – slik at det er overkommelig for alle? 2. Hvilke dugnader og inntektskilder er realistiske? Hva har andre bussgrupper fått til? 3. Hvem har ansvar for økonomien, og hvordan sikrer vi åpenhet og kontroll? 4. Hva skjer om noen ikke klarer å betale til avtalt tid – hvordan løser vi det rettferdig? |
| 6 | Russetiden i 7 dager? | 1. Myndighetene ønsker å begrense russetiden til ca. 7 dager etter eksamen. Hva tenker dere om det? 2. Hvis russetiden blir kortere – hva betyr det for hva dere vil bruke penger på? 3. Påvirker en kortere russetid valget mellom å kjøpe og leie buss? 4. Hva vil dere savne mest med en kortere feiring – og hva kan dere leve uten? |

Hver stasjon har også et tips-felt som vises under spørsmålene:

| # | Tips |
|---|------|
| 1 | Felles opplevelser tidlig i prosessen skaper sterkere bånd enn felles penger på konto. |
| 2 | En god russeopplevelse handler mer om hvem du feirer med enn hva du feirer i. |
| 3 | Åpen dialog mellom foreldre og ungdom er den viktigste beskyttende faktoren. |
| 4 | Erfaringen viser at en god russetid ikke krever det dyreste utstyret – men god planlegging. |
| 5 | Et tydelig budsjett med åpen rapportering forebygger konflikter og bygger tillit. |
| 6 | Endringene fra 2026 kan påvirke rammene for 2028-kullet. Følg med på oppdateringer! |

### 5.2 Stasjonsvelger (deltaker-dashboard under møtet)

Når møtet er aktivt viser dashboardet:

- Velkomstmelding med brukerens navn og gruppenavn
- 6 stasjonskort i et grid (2×3 eller 3×2 på mobil: 1 kolonne)
- Hvert kort viser: stasjonsnummer, tittel, status-ikon

**Stasjonsstatuser per gruppe:**

| Status | Visuell indikator | Betydning |
|--------|-------------------|-----------|
| `available` | Blå/nøytral | Kan startes |
| `active` | Grønn puls | Gruppen er aktiv på denne stasjonen nå |
| `completed` | Grønn hake | Ferdig diskutert |

- Bruker klikker på et `available` kort → åpner stasjonens chatrom
- `completed` stasjoner kan åpnes i lesemodus (ikke skrive nye meldinger)
- Bare én stasjon kan være `active` per gruppe om gangen

---

## 6. Stasjonschat (kjernevisning)

### 6.1 Layout

```
┌─────────────────────────────────────────┐
│ ← Tilbake    Stasjon 3         ⏱ 12:34 │  ← Header
├─────────────────────────────────────────┤
│                                         │
│  Forebygging av rus og narkotika        │  ← Stasjonstittel
│                                         │
│  Spørsmål:                              │  ← Sammenleggbar
│  1. Kontrakten har nulltoleranse...     │     seksjon med
│  2. Én av fire russ har...              │     spørsmålene
│  3. Hvordan kan dere passe på...        │
│  4. Foreldre: Hva trenger dere...       │
│                                         │
│  💡 Tips: Åpen dialog mellom foreldre   │  ← Tips-boks
│  og ungdom er den viktigste...          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Per (forelder) ─────── 14:32 ──┐   │  ← Chat-meldinger
│  │ Jeg tenker at nulltoleranse er  │   │     (scrollbar)
│  │ viktig, men vi må snakke om     │   │
│  │ hva som skjer om noen bryter... │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─ Oliver (ungdom) ────── 14:33 ──┐   │
│  │ Enig, det er litt skummelt å    │   │
│  │ skulle si ifra om en kompis...  │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [Skriv en kommentar...        ] [Send] │  ← Input
├─────────────────────────────────────────┤
│  [ Avslutt stasjon og gå videre → ]    │  ← Avslutt-knapp
└─────────────────────────────────────────┘
```

### 6.2 Header med timer

- **Venstre:** Tilbake-pil (navigerer til stasjonsvelger)
- **Midt:** "Stasjon [nr]"
- **Høyre:** Nedtellingstimer `⏱ MM:SS`

**Timer-regler:**

| Regel | Detalj |
|-------|--------|
| Start | Timeren starter for hele gruppen når **det første gruppemedlemmet** åpner stasjonen |
| Varighet | 15 minutter (900 sekunder) |
| Synkronisering | Alle gruppemedlemmer ser samme tid (basert på `station_sessions.started_at` i databasen) |
| Beregning | `remaining = 900 - (now() - started_at)` – beregnes klientsiden basert på server-timestamp |
| Visuell: > 5 min | Hvit/nøytral farge |
| Visuell: 1–5 min | Gul/oransje farge |
| Visuell: < 1 min | Rød farge, pulserende |
| Visuell: 0:00 | Viser "⏱ 0:00 – Tiden er ute!" i rødt. Chatten forblir åpen – dette er en soft deadline |
| Etter 0:00 | Timer stopper på 0:00. Chatten er fortsatt aktiv. Brukere kan fortsette å skrive |

**Implementasjon:**
- Når første bruker i en gruppe åpner en stasjon, opprettes en `station_sessions`-rad med `started_at = now()` (server-tid)
- Alle påfølgende brukere i gruppen henter `started_at` og beregner gjenværende tid klientsiden
- Bruk `setInterval` (1 sek) for nedtelling
- Ingen server-push nødvendig for timer – kun initial sync via database

### 6.3 Spørsmålsseksjon

- Vises øverst i chatten, over meldingene
- Sammenleggbar/utvidbar (default: utvidet første gang, sammenlagt ved scroll)
- Viser alle 4 spørsmål nummerert
- Viser tips-boksen under spørsmålene
- Sticky-effekt: spørsmålene kan felles sammen til en kompakt linje ("Vis spørsmål ▼") for å gi mer plass til chatten

### 6.4 Sanntidschat

**Meldingsvisning:**

- Meldinger sortert kronologisk (eldst øverst, nyeste nederst)
- Automatisk scroll til bunn ved nye meldinger
- Hver melding viser: avsendernavn, rolle (ungdom/forelder) som tag/badge, tidspunkt (HH:MM), meldingstekst
- Egne meldinger visuelt differensiert (f.eks. høyrejustert eller annen bakgrunnsfarge)

**Meldingsinput:**

- Tekstfelt med placeholder "Skriv en kommentar..."
- Send-knapp (ikon eller tekst)
- Send på Enter (Shift+Enter for linjeskift)
- Maks 2000 tegn per melding
- Deaktivert input dersom stasjon er `completed` (lesemodus)

**Sanntidsoppdatering:**

- Bruk Supabase Realtime subscription på `messages`-tabellen filtrert på `station_id` + `group_id`
- Nye meldinger fra andre brukere vises umiddelbart uten refresh
- Optimistisk UI: egne meldinger vises umiddelbart, bekreftes fra server

### 6.5 Avslutt stasjon

- Knapp nederst: "Avslutt stasjon og gå videre →"
- Hvem som helst i gruppen kan trykke
- Ved klikk: bekreftelsesdialog "Er dere sikre på at dere vil avslutte diskusjonen på denne stasjonen?"
- Ved bekreftelse:
  - `station_sessions`-raden oppdateres med `ended_at = now()` og `status = 'completed'`
  - Alle gruppemedlemmer omdirigeres automatisk til stasjonsvelgeren (via Realtime subscription på `station_sessions`)
  - Stasjonen markeres som `completed` i velgeren
  - Chatten kan fortsatt leses men ikke skrives i

---

## 7. Databaseskjema (Supabase / PostgreSQL)

### 7.1 Tabeller

```sql
-- Invitasjonskoder for registrering
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  role text not null check (role in ('youth', 'parent')),
  is_active boolean default true,
  max_uses integer not null default 50,
  uses integer default 0,
  created_at timestamptz default now()
);

-- Brukerprofiler (utvidelse av Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'youth', 'parent')),
  created_at timestamptz default now()
);

-- Kobling forelder ↔ ungdom
create table parent_youth_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  youth_id uuid not null references profiles(id) on delete cascade,
  unique(parent_id, youth_id)
);

-- Diskusjonsgrupper
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Gruppemedlemskap
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  unique(group_id, profile_id)
);

-- Stasjoner (seed med de 6 faste stasjonene)
create table stations (
  id integer primary key,  -- 1-6
  title text not null,
  questions jsonb not null,  -- ["Spørsmål 1", "Spørsmål 2", ...]
  tip text
);

-- Stasjonssesjoner per gruppe (timer-sporing)
create table station_sessions (
  id uuid primary key default gen_random_uuid(),
  station_id integer not null references stations(id),
  group_id uuid not null references groups(id),
  started_at timestamptz,  -- null = ikke startet, settes ved første besøk
  ended_at timestamptz,    -- null = aktiv, settes ved avslutning
  status text not null default 'available' check (status in ('available', 'active', 'completed')),
  unique(station_id, group_id)
);

-- Chat-meldinger
create table messages (
  id uuid primary key default gen_random_uuid(),
  station_id integer not null references stations(id),
  group_id uuid not null references groups(id),
  profile_id uuid not null references profiles(id),
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz default now()
);

-- Møtestatus (singleton-rad)
create table meeting_status (
  id integer primary key default 1 check (id = 1),
  status text not null default 'not_started' check (status in ('not_started', 'active', 'ended')),
  updated_at timestamptz default now()
);

-- Indekser for ytelse
create index idx_messages_station_group on messages(station_id, group_id);
create index idx_messages_created_at on messages(created_at);
create index idx_group_members_profile on group_members(profile_id);
create index idx_station_sessions_group on station_sessions(group_id);
```

### 7.2 Row Level Security (RLS)

```sql
-- Aktiver RLS på alle tabeller
alter table profiles enable row level security;
alter table messages enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table station_sessions enable row level security;
alter table stations enable row level security;
alter table invite_codes enable row level security;
alter table parent_youth_links enable row level security;
alter table meeting_status enable row level security;

-- Profiles: Alle innloggede kan lese (for dropdown, chat-navn etc.)
create policy "profiles_select" on profiles for select to authenticated using (true);
-- Brukere kan oppdatere sin egen profil
create policy "profiles_update_own" on profiles for update to authenticated using (id = auth.uid());
-- Insert håndteres via server-side function ved registrering

-- Messages: Lese meldinger i egen gruppe
create policy "messages_select" on messages for select to authenticated
  using (group_id in (select group_id from group_members where profile_id = auth.uid()));
-- Skrive meldinger i egen gruppe
create policy "messages_insert" on messages for insert to authenticated
  with check (
    profile_id = auth.uid() and
    group_id in (select group_id from group_members where profile_id = auth.uid())
  );

-- Groups: Alle innloggede kan lese
create policy "groups_select" on groups for select to authenticated using (true);

-- Group members: Alle innloggede kan lese (for å se gruppeoversikt)
create policy "group_members_select" on group_members for select to authenticated using (true);

-- Station sessions: Lese for egen gruppe
create policy "station_sessions_select" on station_sessions for select to authenticated
  using (group_id in (select group_id from group_members where profile_id = auth.uid()));
-- Oppdatere for egen gruppe (starte/avslutte stasjon)
create policy "station_sessions_update" on station_sessions for update to authenticated
  using (group_id in (select group_id from group_members where profile_id = auth.uid()));

-- Stations: Alle innloggede kan lese
create policy "stations_select" on stations for select to authenticated using (true);

-- Invite codes: Kun admin kan administrere, alle kan lese (for validering)
-- Valideringen bør gjøres via en server-side function for sikkerhet
create policy "invite_codes_select" on invite_codes for select to authenticated using (true);

-- Meeting status: Alle kan lese
create policy "meeting_status_select" on meeting_status for select to authenticated using (true);

-- Parent-youth links: Alle innloggede kan lese
create policy "parent_youth_links_select" on parent_youth_links for select to authenticated using (true);

-- Admin-policies (legg til for alle skriveoperasjoner)
-- Bruk en helper-funksjon:
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Eksempel: Admin kan gjøre alt på groups
create policy "groups_admin_all" on groups for all to authenticated using (is_admin());
create policy "group_members_admin_all" on group_members for all to authenticated using (is_admin());
create policy "invite_codes_admin_all" on invite_codes for all to authenticated using (is_admin());
create policy "station_sessions_admin_all" on station_sessions for all to authenticated using (is_admin());
create policy "meeting_status_admin_all" on meeting_status for all to authenticated using (is_admin());
create policy "profiles_admin_all" on profiles for all to authenticated using (is_admin());
create policy "parent_youth_links_admin_all" on parent_youth_links for all to authenticated using (is_admin());
```

### 7.3 Supabase Realtime

Aktiver Realtime for følgende tabeller:

- `messages` – for sanntidschat
- `station_sessions` – for å oppdage at stasjon er avsluttet/startet
- `meeting_status` – for å oppdage at møtet er startet/avsluttet

### 7.4 Database Functions

```sql
-- Funksjon for å starte en stasjon (kalles når første bruker åpner)
-- Bruker upsert-logikk: sett started_at kun om den ikke allerede er satt
create or replace function start_station_session(p_station_id integer, p_group_id uuid)
returns station_sessions as $$
declare
  session station_sessions;
begin
  -- Prøv å inserte ny sesjon
  insert into station_sessions (station_id, group_id, started_at, status)
  values (p_station_id, p_group_id, now(), 'active')
  on conflict (station_id, group_id) do update
    set started_at = coalesce(station_sessions.started_at, now()),
        status = case when station_sessions.status = 'available' then 'active' else station_sessions.status end
  returning * into session;
  
  return session;
end;
$$ language plpgsql security definer;

-- Funksjon for å validere invitasjonskode og registrere bruker
create or replace function validate_invite_code(p_code text)
returns jsonb as $$
declare
  invite invite_codes;
begin
  select * into invite from invite_codes where code = p_code and is_active = true;
  
  if invite is null then
    return jsonb_build_object('valid', false, 'error', 'Ugyldig invitasjonskode');
  end if;
  
  if invite.uses >= invite.max_uses then
    return jsonb_build_object('valid', false, 'error', 'Invitasjonskoden er brukt opp');
  end if;
  
  -- Inkrementer bruk
  update invite_codes set uses = uses + 1 where id = invite.id;
  
  return jsonb_build_object('valid', true, 'role', invite.role);
end;
$$ language plpgsql security definer;

-- Funksjon for eksport (henter all data strukturert)
create or replace function export_meeting_data()
returns jsonb as $$
  select jsonb_agg(
    jsonb_build_object(
      'station_id', s.id,
      'station_title', s.title,
      'groups', (
        select jsonb_agg(
          jsonb_build_object(
            'group_name', g.name,
            'messages', (
              select coalesce(jsonb_agg(
                jsonb_build_object(
                  'timestamp', m.created_at,
                  'author', p.full_name,
                  'role', p.role,
                  'content', m.content
                ) order by m.created_at
              ), '[]'::jsonb)
              from messages m
              join profiles p on p.id = m.profile_id
              where m.station_id = s.id and m.group_id = g.id
            )
          )
        )
        from groups g
      )
    ) order by s.id
  )
  from stations s;
$$ language sql security definer;
```

### 7.5 Seed-data

```sql
-- Sett inn de 6 stasjonene
insert into stations (id, title, questions, tip) values
(1, 'Fellesskap og samhold', 
 '["Hva tror dere skal til for at alle 25 på bussen føler seg som én gjeng?", "Hvilke felles aktiviteter – utenom festing – kan bygge gode relasjoner i gruppen?", "Hytteturen ble trukket frem som et godt eksempel. Hva gjorde den vellykket, og hva mer kan vi gjøre?", "Hvordan kan dere løse konflikter underveis uten at noen faller utenfor?"]',
 'Felles opplevelser tidlig i prosessen skaper sterkere bånd enn felles penger på konto.'),
(2, 'Inkludering og samhold',
 '["Hva betyr inkludering for dere – i praksis, ikke bare i ord?", "Hvordan sikrer vi at buss-prosjektet ikke skaper splittelse blant venner som ikke er med?", "Har dere opplevd at noen føler seg utenfor allerede? Hva kan gjøres?", "Hva bør gjelde som spilleregler for hvordan gruppen behandler hverandre?"]',
 'En god russeopplevelse handler mer om hvem du feirer med enn hva du feirer i.'),
(3, 'Forebygging av rus og narkotika',
 '["Kontrakten har nulltoleranse for narkotika. Hva tenker dere om den regelen – er den realistisk?", "Én av fire russ har brukt narkotika det siste året. Hva gjør dere om noen på bussen bryter regelen?", "Hvordan kan dere passe på hverandre når det gjelder alkohol – uten å bli «politi»?", "Foreldre: Hva trenger dere å vite for å føle dere trygge? Ungdom: Hva trenger dere fra foreldrene?"]',
 'Åpen dialog mellom foreldre og ungdom er den viktigste beskyttende faktoren.'),
(4, 'Hva kan vi oppnå med budsjettet?',
 '["Hva er viktigst for dere å bruke penger på – buss, lyd, lys, klær, eller felles opplevelser?", "Maks innbetaling er satt til 100 000 kr per person. Hva er et realistisk totalt behov?", "Hva er dere villige til å gjøre selv (dugnad, egeninnsats) for å spare penger?", "Hvilke ting kan dere klare dere uten – og hva er «must have»?"]',
 'Erfaringen viser at en god russetid ikke krever det dyreste utstyret – men god planlegging.'),
(5, 'Budsjett og finansieringsplan',
 '["Hvordan vil dere fordele innbetalingene over 26 måneder – slik at det er overkommelig for alle?", "Hvilke dugnader og inntektskilder er realistiske? Hva har andre bussgrupper fått til?", "Hvem har ansvar for økonomien, og hvordan sikrer vi åpenhet og kontroll?", "Hva skjer om noen ikke klarer å betale til avtalt tid – hvordan løser vi det rettferdig?"]',
 'Et tydelig budsjett med åpen rapportering forebygger konflikter og bygger tillit.'),
(6, 'Russetiden i 7 dager?',
 '["Myndighetene ønsker å begrense russetiden til ca. 7 dager etter eksamen. Hva tenker dere om det?", "Hvis russetiden blir kortere – hva betyr det for hva dere vil bruke penger på?", "Påvirker en kortere russetid valget mellom å kjøpe og leie buss?", "Hva vil dere savne mest med en kortere feiring – og hva kan dere leve uten?"]',
 'Endringene fra 2026 kan påvirke rammene for 2028-kullet. Følg med på oppdateringer!');

-- Sett inn initial møtestatus
insert into meeting_status (id, status) values (1, 'not_started');

-- Opprett en admin-bruker (gjøres manuelt etter første registrering,
-- eller via en seed-script som setter rolle i profiles-tabellen)
```

---

## 8. Applikasjonsstruktur (Next.js 14 App Router)

### 8.1 Katalogstruktur

```
src/
├── app/
│   ├── layout.tsx                    # Root layout med Supabase Provider
│   ├── page.tsx                      # Landingsside med registrering/innlogging
│   ├── login/
│   │   └── page.tsx                  # Innloggingsside
│   ├── register/
│   │   └── page.tsx                  # Registreringsside (kode → skjema)
│   ├── dashboard/
│   │   ├── page.tsx                  # Deltaker-dashboard (stasjonsvelger)
│   │   └── station/
│   │       └── [stationId]/
│   │           └── page.tsx          # Stasjonschat
│   └── admin/
│       ├── page.tsx                  # Admin-dashboard (oversikt)
│       ├── users/
│       │   └── page.tsx              # Brukeroversikt
│       ├── codes/
│       │   └── page.tsx              # Invitasjonskoder
│       ├── groups/
│       │   └── page.tsx              # Gruppefordeling
│       ├── meeting/
│       │   └── page.tsx              # Møtestyring (start/stopp)
│       └── export/
│           └── page.tsx              # Eksporter samtaler
├── components/
│   ├── ui/                           # Generelle UI-komponenter
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── dashboard/
│   │   ├── StationGrid.tsx           # 6 stasjonskort
│   │   └── StationCard.tsx           # Enkelt stasjonskort med status
│   ├── station/
│   │   ├── ChatView.tsx              # Hovud-chatvisning
│   │   ├── ChatMessage.tsx           # Enkelt melding
│   │   ├── ChatInput.tsx             # Meldingsinput
│   │   ├── QuestionPanel.tsx         # Sammenleggbar spørsmålsseksjon
│   │   └── StationTimer.tsx          # Nedtellingstimer
│   └── admin/
│       ├── UserTable.tsx
│       ├── CodeManager.tsx
│       ├── GroupBuilder.tsx
│       └── ExportButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase-klient
│   │   ├── server.ts                 # Server-side Supabase-klient
│   │   └── middleware.ts             # Auth middleware
│   ├── types.ts                      # TypeScript-typer for databasen
│   └── utils.ts                      # Hjelpefunksjoner
└── middleware.ts                      # Next.js middleware for auth-redirect
```

### 8.2 Nøkkelkomponenter

**StationTimer.tsx:**
```
Props: startedAt (ISO timestamp), duration (sekunder, default 900)
- Beregner remaining = duration - (Date.now()/1000 - Date.parse(startedAt)/1000)
- useEffect med setInterval(1000ms)
- Fargekoding: hvit > 300s, gul 60-300s, rød < 60s
- Stopper ved 0, viser "Tiden er ute!"
```

**ChatView.tsx:**
```
Props: stationId, groupId
- Henter eksisterende meldinger via Supabase query
- Setter opp Realtime subscription for nye meldinger
- Scroll-til-bunn ved nye meldinger
- Ref til bunn-element for auto-scroll
```

**StationGrid.tsx:**
```
- Henter station_sessions for brukerens gruppe
- Beregner status per stasjon
- Subscription på station_sessions for live-oppdateringer
```

---

## 9. Design og UX

### 9.1 Fargepalett

Gjenbruk av fargene fra samtaleposter-presentasjonen for gjenkjennelighet:

| Bruk | Farge | Hex |
|------|-------|-----|
| Primær (header, knapper) | Mørk teal | `#1B4D5C` |
| Sekundær | Teal | `#2A7F8E` |
| Aksent (CTA, viktig) | Coral/oransje | `#E8734A` |
| Bakgrunn | Varm hvit | `#FBF8F4` |
| Kort-bakgrunn | Hvit | `#FFFFFF` |
| Tekst | Mørk | `#1E2D3D` |
| Undertekst | Dempet | `#3A4F5E` |
| Suksess | Grønn | `#2D8A56` |
| Advarsel (timer) | Gul | `#E8A838` |
| Fare (timer utløpt) | Rød | `#D94040` |

### 9.2 Typografi

- Overskrifter: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", ...`)
- Brødtekst: Samme stack
- Monospace for timer: `"SF Mono", "Fira Code", monospace`

### 9.3 Responsivt design

**Primærenhet:** Mobil (iPhone/Android) – de fleste deltakere bruker telefon.

| Breakpoint | Layout |
|------------|--------|
| < 640px (mobil) | Én kolonne, full bredde. Stasjonskort stables vertikalt. Chat er fullskjerm. |
| 640–1024px (tablet) | To kolonner for stasjonskort. Chat har bredere inputfelt. |
| > 1024px (desktop) | Admin-panel med sidebar. Chat sentrert med maks-bredde. |

### 9.4 Tilgjengelighet

- Alle interaktive elementer har tydelig fokus-indikator
- Fargekontrast minimum WCAG AA
- Aria-labels på ikoner og knapper
- Timer annonseres via aria-live="polite" ved fargeendring

---

## 10. Implementasjonsplan

### Fase 1: Prosjektoppsett og auth (dag 1)
- [ ] Opprett Next.js 14-prosjekt med TypeScript, Tailwind CSS
- [ ] Sett opp Supabase-prosjekt med Auth
- [ ] Kjør database-migrasjoner (tabeller, RLS, functions)
- [ ] Seed stasjonsdata
- [ ] Implementer invitasjonskode-validering
- [ ] Implementer registreringsflyt (ungdom + forelder)
- [ ] Implementer innlogging
- [ ] Sett opp auth middleware

### Fase 2: Admin-panel (dag 2)
- [ ] Brukeroversikt
- [ ] Invitasjonskode-administrasjon
- [ ] Gruppefordeling-UI
- [ ] Møtestyring (start/stopp)

### Fase 3: Stasjonschat (dag 2–3)
- [ ] Stasjonsvelger-dashboard
- [ ] Chat-visning med meldingsliste
- [ ] Meldingsinput med send
- [ ] Supabase Realtime subscription
- [ ] Spørsmålsseksjon (sammenleggbar)
- [ ] Timer-komponent
- [ ] Avslutt-stasjon-flyt

### Fase 4: Eksport og polish (dag 3)
- [ ] Markdown-eksport fra admin
- [ ] Feilhåndtering og edge cases
- [ ] Mobiltesting
- [ ] Deploy til Vercel

---

## 11. Miljøvariabler

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[prosjekt-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # Kun server-side
```

---

## 12. Deploy

- **Vercel:** Koble til Git-repo, auto-deploy ved push
- **Supabase:** Gratis tier er tilstrekkelig (opptil 500 MB database, 2 GB transfer, Realtime inkludert)
- **Domene:** Valgfritt – Vercel gir et `.vercel.app`-subdomene gratis

---

## 13. Tekniske avhengigheter

```json
{
  "dependencies": {
    "next": "^14",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "tailwindcss": "^3.4",
    "typescript": "^5"
  }
}
```

Ingen ekstra avhengigheter kreves utover Next.js + Supabase + Tailwind.

---

## 14. Begrensninger og forenklinger

| Beslutning | Begrunnelse |
|------------|-------------|
| Ingen e-postverifisering | Invitasjonskode er tilstrekkelig barriere. Enklere registrering. |
| Ingen push-notifikasjoner | Alle er i samme rom under møtet. |
| Ingen bildeoppasting | Tekst er tilstrekkelig for diskusjonsnotater. |
| Ingen redigering/sletting av meldinger | Holder det enkelt, unngår tap av diskusjonshistorikk. |
| Hardkodet 6 stasjoner | Stasjonene endres ikke – seed-data er nok. |
| Timer er soft deadline | 15 min er veiledende, gruppen styrer selv. |
| Eksport som .md (ikke PDF) | Markdown er ideelt for videre bruk i Claude for oppsummering. |
| Ingen offline-støtte | Alle har mobildekning i møtelokalet. |
