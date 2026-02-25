-- 019_update_stations_5.sql
-- Move from 6 to 5 stations with updated names and questions

-- Delete station 6 (cascades to station_sessions → messages)
DELETE FROM stations WHERE number = 6;

-- Update station 1
UPDATE stations SET
  title = 'Fellesskap og inkludering',
  description = 'Diskuter hvordan vi kan sikre at alle føler seg inkludert og som en del av gruppen.',
  questions = '["Hva skal til for at alle 25 på bussen føler seg som én gjeng – ikke bare de som kjenner hverandre best fra før?", "Hvordan påvirker buss-prosjektet skolehverdagen – i lunsj, friminutt og på sosiale medier? Hva kan dere gjøre for at ingen føler seg utenfor?", "Dagens kontrakt sier at den som trekker seg mister alle innbetalte penger og må betale 10 000 kr i utmeldingsgebyr. Er det rettferdig – og hva bør gjelde i den nye kontrakten?", "Foreldrene signerer kontrakten, men har i dag verken innsyn i økonomien eller stemmerett. Hva bør foreldrenes rolle være – støttespillere med innsyn, eller bare underskrift?"]',
  tip = 'Tenk på konkrete situasjoner der noen kan falle utenfor – og hva dere kan gjøre for å forebygge det.'
WHERE number = 1;

-- Update station 2
UPDATE stations SET
  title = 'Rus og narkotika',
  description = 'Diskuter holdninger til rus, nulltoleranse og hvordan dere passer på hverandre.',
  questions = '["Kontrakten har nulltoleranse for narkotika med umiddelbar eksklusjon. Er regelen tydelig nok – og er den realistisk å håndheve?", "Én av fire russ har brukt narkotika det siste året. Hva gjør dere konkret om noen på bussen bryter regelen?", "Hvordan passer dere på hverandre når det gjelder alkohol – uten at det blir «politi»-stemning?", "Foreldre: Hva trenger dere å vite for å føle dere trygge? Ungdom: Hva trenger dere fra foreldrene for at det ikke skal bli kleint?"]',
  tip = 'Vær ærlige og respektfulle. Det finnes ingen dumme svar her.'
WHERE number = 2;

-- Update station 3
UPDATE stations SET
  title = 'Økonomi og finansiering',
  description = 'Gå gjennom budsjettet og diskuter økonomiske prioriteringer og innsyn.',
  questions = '["Hva er viktigst å bruke penger på – buss, lyd, lys, klær, eller felles opplevelser? Og hva kan dere klare dere uten?", "Gutta presenterer budsjettet sitt. Er det realistisk? Dekker det alt som trengs – og er det rom for uforutsette utgifter? Hva bør maks totalbeløp per person være i den nye kontrakten?", "Bør hver person spare på egen konto, eller er felles innbetaling best? Hvem skal ha innsyn i økonomien – og hvordan sikrer vi at alle kan se hva pengene brukes til?", "Hva bør gjelde ved forsinket betaling? Dagens kontrakt har gebyr fra dag én uten tak. Er det rettferdig – og hva er et bedre alternativ?"]',
  tip = 'Ha gjerne konkrete tall klare. Et realistisk budsjett gir bedre planlegging.'
WHERE number = 3;

-- Update station 4
UPDATE stations SET
  title = 'Spillereglene – den nye kontrakten',
  description = 'Diskuter hvilke regler som bør gjelde i den nye kontrakten.',
  questions = '["Kontrakten skal skrives på nytt og signeres i fellesskap. Hvilke regler er aller viktigst for at gruppen fungerer over to år?", "Dagens kontrakt har bøter på 10 000 kr for å dele konsept eller dekknavn. Er det rimelig – og hva er et bedre alternativ?", "Bussjefene tar mange beslutninger på vegne av gruppa. Hvordan sikrer vi at de har tillit – og hva bør skje om tilliten svikter?", "Dagens kontrakt tillater varig eksklusjon ved 70 % flertall – uten rett til å forsvare seg, uten klagerett, og uten krav på innbetalte penger. Hva bør prosessen være – og hvilke rettigheter bør den det gjelder ha?"]',
  tip = 'Tenk på hva som skaper trygghet og rettferdighet for alle i gruppen.'
WHERE number = 4;

-- Update station 5
UPDATE stations SET
  title = 'Russetiden i 7 dager?',
  description = 'Diskuter konsekvensene av en mulig kortere russetid og hva det betyr for prosjektet.',
  questions = '["Myndighetene ønsker å begrense russetiden til ca. 7 dager etter eksamen. Hva tenker dere om det – og hvordan påvirker det prosjektet?", "Hvis russetiden blir kortere, endrer det hva det er verdt å bruke penger på?", "Påvirker en kortere russetid valget mellom å kjøpe og leie buss – og bør vi ta høyde for dette allerede nå?", "Hva vil dere savne mest med en kortere feiring – og hva kan dere leve uten?"]',
  tip = 'Tenk på hva som er viktigst å bevare uansett lengde på feiringen.'
WHERE number = 5;
