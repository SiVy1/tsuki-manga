# Tsuki Manga

## Zaawansowany dokument rozwoju aplikacji

Data: 2026-04-02  
Status: aktywny dokument kierunkowy po foundation  
Język dokumentu: polski

## Cel dokumentu

Ten plik opisuje kolejny etap rozwoju `Tsuki Manga` po zbudowaniu fundamentów aplikacji.  
Nie zastępuje master specu ani Phase 2 decisions. Jego rolą jest:

- wyznaczyć realistyczny kierunek rozwoju produktu i aplikacji,
- ustawić priorytety rozwoju na kolejne iteracje,
- połączyć rozwój UX, feature work i architektury w jeden plan,
- ograniczyć chaos decyzyjny przy dalszej implementacji.

To jest dokument strategiczno-wdrożeniowy, nie marketingowy roadmap slide.

---

## Źródła i reguły, na których opiera się ten dokument

Dokument został przygotowany na podstawie:

- `docs/plans/2026-04-01-tsuki-manga-platform-design.md`
- `docs/plans/2026-04-01-tsuki-manga-phase-2-decisions.md`
- `docs/plans/2026-04-01-tsuki-manga-backend-implementation-plan.md`
- `AGENTS.md`
- `docs/AGENTS.md`

Przy jego układaniu zostały użyte odpowiednie skille i ich zasady:

- `next-best-practices`
- `frontend-design`
- `brainstorming`

Wpływ tych źródeł na dokument:

- `next-best-practices` ogranicza architekturę do poprawnych wzorców `App Router`, `Server Components`, `Server Actions`, metadata, route handlers i self-hostingu.
- `frontend-design` wzmacnia kierunek UI jako świadomie editorialny, spokojny i charakterystyczny, zamiast generycznego panelu SaaS.
- istniejące docs projektu utrzymują produkt jako `single-group`, `Docker-first`, `Next.js monolith` z restrained UI i workflow `draft -> publish`.

---

## 1. Stan wyjściowy aplikacji

Na dzień tego dokumentu aplikacja nie jest już greenfieldem. Ma już działające fundamenty:

- publiczny `site`,
- `reader`,
- `dashboard`,
- `Auth.js`,
- `Prisma + PostgreSQL`,
- adaptery storage,
- podstawy SEO,
- role i permissions,
- testy i deployment foundation,
- opcjonalny dark mode.

To oznacza, że kolejny etap rozwoju nie powinien skupiać się na dalszym scaffoldingu.  
Priorytetem staje się:

- redukcja tarcia w głównych flow,
- dopracowanie jakości produktu,
- uszczelnienie operacyjności self-host,
- budowanie przewagi UX tam, gdzie projekt faktycznie może być lepszy od alternatyw.

---

## 2. Główna teza rozwojowa

`Tsuki Manga` powinno rozwijać się nie jako „duża platforma manga”, ale jako:

- bardzo dobre narzędzie dla jednej grupy scanlacyjnej,
- bardzo czysty i szybki reader,
- bardzo prosty do wdrożenia self-hosted produkt.

Najlepszy kierunek strategiczny to połączenie trzech osi:

- `publisher-first`
- `reader-first`
- `self-host quality`

Nie należy rozwijać projektu w stronę:

- społecznościówki,
- agregatora wielu grup,
- marketplace,
- ogólnego CMS-a,
- ciężkiego panelu typu enterprise admin.

To byłyby boczne ścieżki, które zwiększają koszt utrzymania i osłabiają tożsamość produktu.

---

## 3. North Star produktu

North Star dla kolejnych iteracji:

- editor potrafi stworzyć serię i draft rozdziału bez tarcia,
- publisher publikuje rozdział w kilka minut, nie w kilka ekranów frustracji,
- reader dostaje szybki, spokojny i estetyczny experience na mobile i desktopie,
- administrator stawia i utrzymuje instancję bez rozbijania systemu na wiele usług,
- całość pozostaje lekka wizualnie i technicznie.

Praktyczne tłumaczenie tej zasady:

- mniej nowych modułów,
- więcej jakości w głównych ścieżkach,
- mniej „features for features”,
- więcej dopracowania przepływu, wydajności i operacyjności.

---

## 4. Filar rozwoju produktu

### 4.1 Editorial workflow

Najwyższy priorytet biznesowy.

System ma być przede wszystkim narzędziem do publikacji:

- szybkie tworzenie serii i chapterów,
- bezbolesny upload i porządkowanie stron,
- pewny preview draftu,
- czytelne statusy i publish flow,
- bezpieczne restore i soft delete,
- jasne role i odpowiedzialności.

Jeśli panel redakcyjny jest przeciętny, produkt traci sens niezależnie od jakości readera.

### 4.2 Reader quality

Najwyższy priorytet UX-owy.

Reader powinien stać się najmocniejszym elementem produktu:

- szybki first render,
- stabilne przewijanie,
- mocny mobile UX,
- prawie zerowy chrome,
- dobra nawigacja chapterów,
- trwała preferencja trybu czytania,
- czytelna relacja między serią, chapterem i ciągłością czytania.

Reader nie ma być efektowny. Ma być bardzo dobry.

### 4.3 Instance identity

Tożsamość instancji ma wspierać grupę, ale nie zamieniać aplikacji w page builder.

Zakres rozwoju:

- branding,
- metadata i SEO,
- social links,
- homepage hierarchy,
- lepsze OG i publiczne entry points,
- spójny theme system.

Zakres poza kierunkiem:

- pełny custom layout builder,
- dynamiczne sekcje CMS na home,
- white-label bez granic.

### 4.4 Self-host maturity

To jest filar, który zamienia projekt z „fajnego dema” w realny produkt:

- prosty setup lokalny i produkcyjny,
- bezpieczne migracje,
- backup guidance,
- healthchecki,
- storage sanity,
- sensowne runbooki,
- przewidywalne deploye i upgrade path.

To nie jest dodatek. To część obietnicy produktu.

---

## 5. Kierunek UI i UX dla dalszego rozwoju

### 5.1 Stałe zasady wizualne

Kolejne prace UI muszą zachować istniejący kierunek:

- editorial minimalism,
- spokojne światło jako główna tożsamość,
- płytka hierarchia wizualna,
- minimum pudełek i ramek,
- typografia i spacing jako główne narzędzia hierarchii,
- dashboard bardziej gęsty niż public site, ale nadal czysty i spokojny.

Dark mode ma być wsparciem jakościowym, nie rebrandingiem aplikacji.

### 5.2 Public site

Publiczna część powinna rozwijać się wokół treści, nie wokół marketingu.

Priorytety:

- home szybciej przechodzi do contentu,
- `Najnowsze aktualizacje` pozostają kluczową sekcją,
- katalog serii ma być prosty, szybki i cover-led,
- strona serii ma zachować pionowy, spokojny układ,
- hero może być estetyczny, ale nie może dominować nad treścią.

### 5.3 Reader

Reader powinien być najbardziej restrykcyjnie pilnowanym widokiem w całej aplikacji.

Zasady:

- zero przypadkowego clutteru,
- zero ciężkich paneli,
- nawigacja tylko tam, gdzie pomaga,
- wszystkie nowe kontrolki muszą uzasadniać swoją obecność.

### 5.4 Dashboard

Dashboard ma wspierać pracę, nie udawać „pełną platformę operatorską”.

Priorytety UI:

- jasne listy i statusy,
- wyraźna jedna główna akcja w danym ekranie,
- formularze, które nie męczą,
- czytelna praca na coverach i stronach,
- mało decyzji na ekran, ale szybkie przechodzenie dalej.

---

## 6. Guardraile techniczne dla dalszego rozwoju

### 6.1 `Next.js` i `App Router`

Dalszy rozwój musi pozostać zgodny z tym modelem:

- odczyty danych domyślnie w `Server Components`,
- mutacje z UI domyślnie przez `Server Actions`,
- `Route Handlers` tylko dla auth, health, draft asset delivery i realnych integracji zewnętrznych,
- brak budowania wewnętrznego REST API dla rzeczy, które mogą zostać w `Server Components` lub `Server Actions`,
- `Node.js runtime` pozostaje domyślny,
- `metadata` i `generateMetadata` pozostają po stronie serwera.

### 6.2 Data fetching i wydajność

Rozwój ekranów nie może iść w kierunku wodospadów danych.

Reguły:

- równoległe fetchowanie przez `Promise.all` tam, gdzie to możliwe,
- preload lub `cache()` dla danych używanych jednocześnie przez stronę i metadata,
- Suspense tylko tam, gdzie rzeczywiście poprawia percepcję szybkości,
- unikać client-side fetchingu dla głównych widoków publicznych i dashboardowych.

### 6.3 Auth i permissions

Auth ma pozostać prosty produktowo, ale szczelny technicznie.

Priorytety:

- brak crashy przy niepoprawnej sesji,
- czytelne rozdzielenie `unauthorized` i `forbidden`,
- brak self-escalation,
- spójność między sesją, DB i UI,
- testowy auth pozostaje narzędziem developerskim, nie półproduktem dla produkcji.

### 6.4 Route handlers i integracje

W przyszłych iteracjach route handlers mogą być rozszerzane tylko dla:

- webhooków,
- publicznego feedu lub exportu,
- healthchecków,
- draft asset access,
- potencjalnych importów danych.

Nie należy ich używać jako zastępczego backendu panelowego.

### 6.5 Self-host i deploy

Rozwój nie może zakładać środowiska Vercel-only.

Każda większa zmiana powinna być oceniana pod kątem:

- zgodności z `output: 'standalone'`,
- działania w `docker compose`,
- migracji DB,
- storage local oraz `S3-compatible`,
- czytelnego fallbacku env.

---

## 7. Roadmapa etapowa

### Etap A: Stabilizacja i product hardening

Cel:

- doprowadzić obecny foundation do stanu codziennej używalności.

Zakres:

- uszczelnienie auth i role flow,
- domknięcie theme system i preference sync,
- wygładzenie settings, branding i SEO fallbacków,
- poprawa komunikatów błędów i stanów pustych,
- redukcja regresji w public site i dashboardzie,
- uporządkowanie dev seed flow i lokalnego test auth.

Kryterium wyjścia:

- wszystkie główne flow działają bez ręcznego debugowania,
- lokalne środowisko daje przewidywalny start,
- aplikacja nie ma znanych blockerów w auth, settings, theme i dashboard shell.

### Etap B: Editorial acceleration

Cel:

- uczynić panel realnym narzędziem pracy zespołu.

Zakres:

- lepszy upload chapter pages,
- wygodniejsze reorder i podmiana stron,
- draft preview bez tarcia,
- lepszy chapter detail screen,
- szybsze tworzenie rozdziałów z poziomu serii,
- bardziej praktyczny dashboard overview,
- czytelniejsze stany `draft`, `published`, `hidden`, `trash`,
- ewentualny `schedule publish` dopiero jeśli nie komplikuje v1 foundation.

Kryterium wyjścia:

- editor może przejść od pustej serii do gotowego draftu bez obchodzenia UI,
- publisher ma czytelną i szybką ścieżkę publikacji,
- panel przestaje być „technicznie działający”, a staje się „sprawny”.

### Etap C: Reader excellence

Cel:

- zbudować najmocniejszą część produktu po stronie czytelnika.

Zakres:

- dopracowanie chapter navigation,
- pamięć postępu czytania,
- preloading następnego chapteru tam, gdzie daje realną wartość,
- lepszy mobile spacing i typografia,
- lepszy performance dużych rozdziałów,
- udoskonalenie trybów `webtoon`, `vertical`, `right-to-left`,
- ograniczenie UI readera do naprawdę potrzebnych elementów.

Kryterium wyjścia:

- reader działa szybko i spokojnie na mobile oraz desktopie,
- przechodzenie między chapterami jest bezwysiłkowe,
- produkt zaczyna wyróżniać się jakością czytania, nie tylko faktem istnienia.

### Etap D: Public discovery i identity

Cel:

- poprawić wejście do treści i jakość publicznego frontu bez rozwadniania produktu.

Zakres:

- dalsze dopracowanie home,
- poprawa katalogu i filtrów,
- pełniejsze metadata, canonicale, OG i sitemap,
- feed lub RSS nowych rozdziałów,
- lepsza prezentacja serii w kartach i stronie serii,
- lepsze wykorzystanie `InstanceSettings` jako identity layer.

Kryterium wyjścia:

- nowy użytkownik szybciej rozumie, co może czytać,
- seria i chaptery są łatwiejsze do znalezienia i udostępniania,
- public site wygląda dojrzale, ale nie zmienia się w landing page.

### Etap E: Self-host maturity

Cel:

- zamknąć obietnicę wdrożeniową produktu.

Zakres:

- runbooki backupu i restore,
- walidacja konfiguracji storage i URL-i,
- lepsze healthchecki i deployment docs,
- bezpieczna historia migracji,
- proste narzędzia do sanity-check po deployu,
- ewentualny import contentu z prostych źródeł wejściowych.

Kryterium wyjścia:

- administrator może utrzymywać instancję bez zaglądania do kodu przy każdej zmianie,
- deployment i upgrade mają przewidywalny rytm.

---

## 8. Priorytety „Now / Next / Later”

### Now

- auth i role hardening
- dev/test auth sanity
- theme i preference stability
- settings i branding polish
- dashboard UX tarcia
- test coverage dla krytycznych flow

### Next

- chapter upload UX
- draft preview polish
- reader progress i chapter continuity
- katalog i strona serii polish
- metadata i discovery improvements

### Later

- scheduled publishing
- RSS/export/import
- runbooki operacyjne i backupy
- bardziej zaawansowane narzędzia redakcyjne

---

## 9. Obszary, które warto rozwinąć dokumentacyjnie równolegle

Wraz z rozwojem kodu powinny powstać kolejne wyspecjalizowane dokumenty:

- `docs/runbooks/deployment.md`
- `docs/runbooks/backup-and-restore.md`
- `docs/runbooks/storage-migration.md`
- `docs/features/reader-experience.md`
- `docs/features/editorial-workflow.md`
- `docs/adr/` dla decyzji, które zmienią obecne założenia

Nie trzeba ich pisać od razu, ale warto mieć taki doc map w głowie.

---

## 10. Mierniki jakości rozwoju

Projekt powinien być oceniany nie po liczbie funkcji, tylko po jakości głównych ścieżek.

Sygnały, że rozwój idzie w dobrym kierunku:

- mniej regresji w auth, settings i dashboard shell,
- krótsza ścieżka od utworzenia serii do publikacji chaptera,
- mniej wizualnego clutteru mimo wzrostu funkcji,
- stabilniejszy reader na mobile,
- mniej specjalnych przypadków w storage i deployu,
- lepsza przewidywalność dla kolejnych implementerów.

Sygnały, że projekt zaczyna zbaczać:

- pojawia się dużo nowych ekranów bez realnego skrócenia pracy,
- dashboard zaczyna przypominać generyczny panel SaaS,
- public site staje się bardziej marketingowy niż contentowy,
- mutacje rozchodzą się po `route.ts` zamiast pozostać w `Server Actions`,
- rośnie liczba wyjątków od głównych reguł produktu.

---

## 11. Świadome non-goals na najbliższy etap

Nie rozwijać teraz:

- komentarzy,
- ocen i reakcji,
- feedów społecznościowych,
- multi-tenant,
- publicznego API dla zewnętrznych klientów,
- wieloetapowego enterprise workflow redakcyjnego,
- zaawansowanej analityki,
- kreatora layoutów i rozbudowanego CMS home.

Każda z tych rzeczy zwiększa koszt produktu bardziej niż jego aktualną wartość.

---

## 12. Decyzja końcowa dla kolejnych iteracji

Najbliższy rozwój `Tsuki Manga` powinien być prowadzony według tej kolejności:

1. ustabilizować foundation i usunąć tarcie w głównych flow,
2. dopracować workflow redakcyjny,
3. uczynić reader najmocniejszą częścią produktu,
4. poprawić public discovery i identity,
5. domknąć self-host maturity.

To jest kierunek bardziej wartościowy niż szybkie dokładanie kolejnych funkcji pobocznych.  
Jeżeli projekt utrzyma tę dyscyplinę, ma szansę stać się naprawdę dobrym, samodzielnym narzędziem dla jednej grupy scanlacyjnej, zamiast tylko kolejnym „manga CMS-em”.
