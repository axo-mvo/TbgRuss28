/**
 * Seed conversations: Inserts realistic chat messages for all groups at all stations.
 * Works with whatever groups and members already exist in the database.
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/seed-conversations.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Realistic Norwegian messages per station number
const MESSAGES: Record<number, string[]> = {
  1: [
    "Alle 25 må føle seg som én gjeng, ikke bare de som kjenner hverandre best fra før.",
    "Buss-prosjektet påvirker skolehverdagen – i lunsj, friminutt og på sosiale medier.",
    "Vi må passe på at ingen føler seg utenfor, heller ikke de som er stille.",
    "Kontrakten sier at den som trekker seg mister alle innbetalte penger og må betale 10 000 kr. Er det rettferdig?",
    "Foreldrene signerer kontrakten, men har verken innsyn i økonomien eller stemmerett.",
    "Jeg synes foreldrene bør ha innsyn, men ikke nødvendigvis stemmerett i alt.",
    "Vi bør ha faste samlinger der alle kan bli bedre kjent med hverandre.",
    "Sosiale medier kan gjøre inkludering vanskeligere. Lukka grupper kan føles ekskluderende.",
    "Det handler om å skape minner sammen, ikke bare feste.",
    "Kanskje vi kan ha aktiviteter der man må samarbeide med folk man ikke kjenner så godt?",
    "Vi bør aktivt oppsøke de som virker ensomme eller trekker seg tilbake.",
    "Som forelder synes jeg det er flott at dere tenker på dette allerede nå.",
  ],
  2: [
    "Nulltoleranse for narkotika med umiddelbar eksklusjon – er regelen tydelig nok?",
    "Én av fire russ har brukt narkotika det siste året. Hva gjør vi konkret om noen bryter regelen?",
    "Vi bør passe på hverandre med alkohol uten at det blir «politi»-stemning.",
    "Foreldre trenger å vite nok til å føle seg trygge, uten at det blir kleint.",
    "Kompiskontrakten er en god idé - at man avtaler grenser på forhånd.",
    "Det er viktig å vite hva man gjør hvis noen blir dårlige. Førstehjelp er viktig!",
    "Som forelder er jeg lettet over at dere tar dette så seriøst.",
    "Vi bør alle ha ICE-nummeret til foreldrene lett tilgjengelig.",
    "Det er helt ok å si nei. Ingen bør bli dømt for det.",
    "Vi bør ha en buddy-ordning der man alltid har noen som passer på en.",
    "Hvis noen havner i trøbbel, er det viktigste at de tør å ringe for hjelp.",
    "Vi trenger en tydelig prosess for hva som skjer om noen bryter narkotika-regelen.",
  ],
  3: [
    "Hva er viktigst å bruke penger på – buss, lyd, lys, klær, eller felles opplevelser?",
    "Vi bør lage et detaljert budsjett tidlig, slik at alle vet hva de går til.",
    "Ikke alle har like mye penger. Vi må finne løsninger som fungerer for alle.",
    "Er det rom for uforutsette utgifter i budsjettet? Hva bør maks totalbeløp per person være?",
    "Bør hver person spare på egen konto, eller er felles innbetaling best?",
    "Alle bør ha innsyn i økonomien – vi trenger et åpent regnskap.",
    "Dagens kontrakt har gebyr fra dag én uten tak ved forsinket betaling. Er det rettferdig?",
    "Sponsorer kan hjelpe med å dekke noen kostnader, men det krever innsats.",
    "Vi bør prioritere opplevelser over dyre ting. Det handler om minner, ikke merker.",
    "Kanskje vi kan ha dugnad for å tjene inn litt av det vi trenger?",
    "Det er lurt å ha en buffer i budsjettet for uforutsette utgifter.",
    "Det viktigste er at alle bidrar med sin tid, ikke bare penger.",
  ],
  4: [
    "Kontrakten skal skrives på nytt og signeres i fellesskap. Hvilke regler er viktigst?",
    "Dagens kontrakt har bøter på 10 000 kr for å dele konsept eller dekknavn. Er det rimelig?",
    "Bussjefene tar mange beslutninger. Hvordan sikrer vi at de har tillit?",
    "Hva bør skje om tilliten til bussjefene svikter? Vi trenger en prosess.",
    "Dagens kontrakt tillater varig eksklusjon ved 70 % flertall – uten rett til å forsvare seg.",
    "Den som ekskluderes bør ha rett til å forsvare seg og krav på innbetalte penger.",
    "Vi bør ha en klagerett og en rettferdig prosess for konflikter.",
    "Det er viktig at reglene er tydelige fra starten, slik at alle vet hva som gjelder.",
    "Kanskje vi kan ha en uavhengig tredjepart som kan mekle ved konflikter?",
    "Vi bør stemme over de viktigste reglene, slik at alle føler eierskap.",
    "Bøter bør stå i forhold til alvoret. 10 000 kr for å dele et navn er for mye.",
    "En god kontrakt beskytter alle – ikke bare de som har makt.",
  ],
  5: [
    "Myndighetene ønsker å begrense russetiden til ca. 7 dager etter eksamen. Hva tenker dere?",
    "Hvis russetiden blir kortere, endrer det hva det er verdt å bruke penger på.",
    "Påvirker en kortere russetid valget mellom å kjøpe og leie buss?",
    "Vi bør ta høyde for mulige endringer allerede nå i planleggingen.",
    "Hva vil dere savne mest med en kortere feiring – og hva kan dere leve uten?",
    "Kanskje en kortere russetid gjør at vi må prioritere hardere?",
    "Hvis det bare blir 7 dager, er det enda viktigere at vi planlegger godt.",
    "En kortere feiring kan faktisk gjøre den mer intens og minneverdig.",
    "Vi bør uansett sørge for at vi får mest mulig ut av tiden vi har.",
    "Som forelder er jeg egentlig positiv til en kortere russetid.",
    "Det viktigste er fellesskapet, ikke hvor mange dager det varer.",
    "Leie gir mer mening om russetiden blir kort – slipper å eie noe vi bruker 7 dager.",
  ],
};

function pick<T>(arr: T[], n: number, offset: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[(offset + i) % arr.length]);
  }
  return result;
}

function randomMinutesAgo(base: number, range: number): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() - base - Math.floor(Math.random() * range));
  return d;
}

async function main() {
  console.log("=== Seed Conversations ===\n");

  const { data: groups } = await sb.from("groups").select("id, name").order("name");
  const { data: stations } = await sb.from("stations").select("id, number, title").order("number");

  if (!groups || groups.length === 0) throw new Error("No groups found");
  if (!stations || stations.length === 0) throw new Error("No stations found");

  console.log(`Found ${groups.length} groups: ${groups.map((g) => g.name).join(", ")}`);
  console.log(`Found ${stations.length} stations: ${stations.map((s) => `${s.number}. ${s.title}`).join(", ")}\n`);

  let totalMessages = 0;
  let totalSessions = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];

    // Get actual members for this group
    const { data: members } = await sb
      .from("group_members")
      .select("user_id")
      .eq("group_id", group.id);

    if (!members || members.length === 0) {
      console.log(`[skip] ${group.name} – no members`);
      continue;
    }

    const memberIds = members.map((m) => m.user_id);

    for (const station of stations) {
      const msgPool = MESSAGES[station.number];
      if (!msgPool) {
        console.log(`  [skip] No messages defined for station ${station.number}`);
        continue;
      }

      // Check for existing session
      const { data: existingSession } = await sb
        .from("station_sessions")
        .select("id, status")
        .eq("station_id", station.id)
        .eq("group_id", group.id)
        .maybeSingle();

      let sessionId: string;
      const sessionStart = randomMinutesAgo(120, 60);
      const sessionEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000);

      if (existingSession) {
        sessionId = existingSession.id;
        if (existingSession.status !== "completed") {
          await sb.from("station_sessions").update({
            status: "completed",
            started_at: sessionStart.toISOString(),
            end_timestamp: sessionEnd.toISOString(),
            completed_at: sessionEnd.toISOString(),
          }).eq("id", sessionId);
        }
      } else {
        const { data: newSession, error } = await sb.from("station_sessions").insert({
          station_id: station.id,
          group_id: group.id,
          status: "completed",
          started_at: sessionStart.toISOString(),
          end_timestamp: sessionEnd.toISOString(),
          completed_at: sessionEnd.toISOString(),
        }).select("id").single();

        if (error) {
          console.error(`  [error] Session ${group.name} @ station ${station.number}:`, error.message);
          continue;
        }
        sessionId = newSession.id;
        totalSessions++;
      }

      // Check if messages already exist
      const { count } = await sb.from("messages").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
      if (count && count > 0) {
        console.log(`  [skip] ${group.name} @ Station ${station.number} – already has ${count} messages`);
        continue;
      }

      // Pick 8-10 messages
      const msgCount = 8 + (gi % 3);
      const selectedMsgs = pick(msgPool, msgCount, gi * 2);

      const msgRows = selectedMsgs.map((content, i) => {
        const userId = memberIds[i % memberIds.length];
        const msgTime = new Date(sessionStart.getTime() + (i + 1) * 90_000);
        return {
          session_id: sessionId,
          user_id: userId,
          content,
          created_at: msgTime.toISOString(),
        };
      });

      const { error: msgErr } = await sb.from("messages").insert(msgRows);
      if (msgErr) {
        console.error(`  [error] Messages ${group.name} @ station ${station.number}:`, msgErr.message);
      } else {
        totalMessages += msgRows.length;
        console.log(`  [ok] ${group.name} @ Station ${station.number}: ${msgRows.length} messages`);
      }
    }
  }

  console.log(`\n=== Done! Created ${totalSessions} sessions, inserted ${totalMessages} messages ===`);
}

main().catch(console.error);
