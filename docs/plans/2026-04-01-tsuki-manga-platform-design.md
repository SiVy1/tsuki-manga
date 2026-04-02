# Tsuki Manga

## Master spec projektu v1

Data: 2026-04-01  
Status: zaakceptowany kierunek produktu i architektury  
Język dokumentu: polski

## Źródła decyzji

Ten dokument został przygotowany na podstawie założeń produktowych ustalonych dla projektu oraz reguł ze skillów:

- `~/.agents/skills/next-best-practices`
- `~/.agents/skills/ui-ux-pro-max`

Ich rola w tym dokumencie jest praktyczna, nie dekoracyjna:

- `next-best-practices` wyznacza granice architektoniczne dla `Next.js App Router`, podziału na `Server Components`, `Server Actions`, `Route Handlers`, SEO, error handling i self-hostingu.
- `ui-ux-pro-max` dostarcza kierunek wizualny dla produktu content-heavy: paper-like minimalism, editorial hierarchy, rozsądny motion, wysoką czytelność i zasady dostępności.

---

## 1. Manifest produktu

`Tsuki Manga` ma być lekką, nowoczesną i łatwą do wdrożenia platformą do czytania i publikowania skanlacji, którą dowolna grupa może pobrać z GitHuba i uruchomić jako własną instancję.

To nie ma być wielki portal agregujący wiele ekip ani kombajn do wszystkiego. Rdzeniem produktu jest jeden serwer dla jednej grupy, z czytelnym readerem, prostym panelem i workflow, który faktycznie odpowiada pracy skanlacyjnej.

Najważniejszy kompromis projektowy brzmi tak:

- wybieramy prostotę wdrożenia i utrzymania ponad maksymalną elastyczność architektury,
- wybieramy UX podporządkowany czytaniu ponad efektowność,
- wybieramy panel szyty pod serię i rozdział ponad ogólny CMS,
- wybieramy architekturę monolitu self-hosted ponad kilka osobnych usług.

Docelowy użytkownik produktu to:

- zespół skanlacyjny, który chce mieć własną stronę i własny panel,
- administrator VPS-a lub hostingu, który chce prostego deploymentu,
- czytelnik, który oczekuje szybkiego, wygodnego i estetycznego czytania bez wizualnego chaosu.

---

## 2. Cele projektu

### 2.1 Cele główne

1. Umożliwić łatwe postawienie własnej instancji z GitHuba bez rozbijania projektu na kilka osobnych usług.
2. Zbudować publiczny reader, który wygląda nowocześnie, ale nie odciąga uwagi od treści.
3. Zbudować panel redakcyjny do dodawania serii i rozdziałów z workflow `draft -> publish`.
4. Umożliwić podstawowe dostosowanie instancji do konkretnej grupy bez grzebania w kodzie.
5. Zaprojektować fundament, który da się rozwinąć później bez przepisywania całego rdzenia.

### 2.2 Kryteria sukcesu v1

- nowa instancja uruchamia się przez `docker compose`,
- użytkownik może zalogować się przez OAuth,
- admin nadaje role zespołowe,
- editor tworzy serię i draft rozdziału,
- publisher publikuje rozdział,
- opublikowany rozdział trafia na stronę główną i stronę serii,
- storage działa zarówno lokalnie, jak i przez `S3-compatible`,
- branding instancji można zmienić bez edycji kodu aplikacji.

---

## 3. Zakres v1 i rzeczy poza zakresem

### 3.1 W zakresie v1

- publiczna strona z home, katalogiem serii, kartą serii i readerem,
- konta użytkowników przez `Auth.js` i OAuth, startowo `Discord`,
- role `reader`, `editor`, `publisher`, `admin`,
- panel pod `/dashboard`,
- zarządzanie seriami,
- zarządzanie rozdziałami,
- upload stron rozdziału,
- workflow `draft -> publish`,
- branding instancji,
- storage `local disk` oraz `S3-compatible`,
- `PostgreSQL` jako główna baza danych,
- `Docker-first` deployment.

### 3.2 Poza zakresem v1

- multi-tenant i wiele grup w jednej instancji,
- komentarze, oceny, profile społecznościowe, feed społecznościowy,
- wieloetapowy pipeline typu `translator -> cleaner -> typesetter -> QC -> publisher`,
- rozbudowana moderacja społeczności,
- aplikacja mobilna,
- publiczne REST API dla zewnętrznych klientów,
- mechanika marketplace lub katalogu wielu wydawców,
- pełna white-label personalizacja layoutu,
- złożone analityki redakcyjne,
- multi-instance cache invalidation dla wielu równoległych serwerów.

### 3.3 Celowy limit złożoności

Ten projekt ma być prosty do postawienia. Dlatego v1 świadomie nie próbuje rozwiązać wszystkich problemów dużej platformy wydawniczej. Odcinamy to, co nie pomaga w pierwszym realnym use-case jednej grupy skanlacyjnej.

---

## 4. Zasady projektowe

### 4.1 Zasady produktu

- Jedna instancja obsługuje jedną grupę.
- Czytelnik widzi gotową treść, nie surowe workflow.
- Panel ma być prosty i zadaniowy, nie „enterprise” dla samego wyglądu.
- Każda ważna decyzja techniczna ma wspierać self-hosting.

### 4.2 Zasady architektury

- Monolit aplikacyjny zamiast osobnego frontend + backend.
- `Next.js App Router` jako centrum UI, routingu, renderingu, SEO i mutacji.
- Odczyt danych po stronie serwera, mutacje jako `Server Actions`, integracje zewnętrzne jako `Route Handlers`.
- Jeden spójny model storage za adapterem.
- Domyślny runtime: `Node.js`.

### 4.3 Zasady UI/UX

- Czytelność ponad ozdobność.
- Płaska hierarchia wizualna.
- Minimalna liczba widocznych warstw.
- Spokojna kolorystyka.
- Motion tylko tam, gdzie pomaga orientacji.
- Reader ma być najczystszą częścią systemu.

---

## 5. Architektura systemu

### 5.1 Główna decyzja

Projekt zostaje zaprojektowany jako `Next.js monolith` z `App Router`.

W jednej aplikacji znajdują się:

- publiczna część czytelnicza,
- panel redakcyjny,
- warstwa autoryzacji,
- mutacje danych,
- SEO i metadane,
- podstawowe endpointy integracyjne.

### 5.2 Stos technologiczny

- `Next.js` z `App Router`
- `TypeScript`
- `Tailwind CSS`
- `Framer Motion` do ograniczonego motion
- `PostgreSQL`
- `Auth.js`
- ORM warstwy danych zgodny z `Node.js runtime` i `PostgreSQL`
- storage adapter `local` lub `S3-compatible`
- `Docker` i `docker compose`

### 5.3 Dlaczego monolit

Monolit jest tu lepszy niż osobne API, bo:

- łatwiej go odpalić z GitHuba,
- ma mniej punktów konfiguracji,
- nie wymaga osobnego deploymentu API,
- dobrze współpracuje z `Server Components` i `Server Actions`,
- zmniejsza liczbę miejsc, w których trzeba pilnować auth, typów i kontraktów.

### 5.4 Dlaczego nie osobne API w v1

Osobne API zwiększyłoby:

- liczbę serwisów do utrzymania,
- koszt uruchomienia nowej instancji,
- liczbę decyzji wdrożeniowych,
- ryzyko rozjazdu typów i modeli danych,
- złożoność autoryzacji dla dashboardu.

To byłoby uzasadnione dopiero wtedy, gdyby produkt miał:

- natywne aplikacje mobilne,
- publiczne API dla zewnętrznych klientów,
- wiele zespołów i odrębne kanały integracji,
- dużą skalę niezależnego skalowania backendu.

### 5.5 Wysokopoziomowy schemat odpowiedzialności

- `Next.js`: routing, rendering, SEO, dashboard, mutacje, część endpointów
- `PostgreSQL`: treść, role, ustawienia instancji, metadane plików
- `Auth.js`: sesje, integracja OAuth, powiązanie tożsamości z użytkownikiem aplikacji
- storage adapter: fizyczne przechowywanie okładek i stron
- `Docker`: spakowanie aplikacji do prostego self-hostingu

---

## 6. Model produktu i role

### 6.1 Role

#### `reader`

- może logować się przez OAuth,
- może czytać opublikowane treści,
- nie ma dostępu do panelu.

#### `editor`

- może tworzyć i edytować serie,
- może dodawać i edytować drafty rozdziałów,
- może wrzucać strony, porządkować kolejność i robić preview,
- nie publikuje finalnie treści.

#### `publisher`

- może publikować i cofać publikację rozdziałów,
- odpowiada za moment przejścia z draftu do wersji publicznej.

#### `admin`

- zarządza rolami użytkowników,
- zarządza ustawieniami instancji,
- zarządza konfiguracją brandingu i integracji,
- ma pełny dostęp do panelu.

### 6.2 Zasady dostępu

- Każdy może wejść na publiczne strony.
- Każdy może się zalogować przez obsługiwany provider OAuth.
- Samo zalogowanie nie daje dostępu do `/dashboard`.
- Dostęp do panelu dostają wyłącznie konta z rolą `editor`, `publisher` albo `admin`.
- Nadawanie ról jest ręczne i należy do admina.

### 6.3 Model tworzenia kont

W v1 obowiązuje model `public sign-in + ręczne role`.

Powód:

- czytelnicy nie wymagają ręcznego onboardingu,
- panel pozostaje zamknięty,
- administracja rolami jest bezpieczniejsza niż automatyczne „staff invites”,
- rozwiązanie jest proste do zrozumienia i wdrożenia.

### 6.4 Bootstrap pierwszego admina

Pierwszy administrator jest wskazany przez konfigurację środowiska, np. przez listę dozwolonych identyfikatorów lub emaili. To eliminuje potrzebę budowania osobnego kreatora pierwszego uruchomienia w v1.

---

## 7. Model treści i danych

### 7.1 `InstanceSettings`

Przechowuje ustawienia konkretnej instancji:

- nazwa serwisu,
- krótki opis,
- branding,
- kolor akcentu,
- ustawienia SEO,
- informacje o aktywnym driverze storage,
- treści pomocnicze strony głównej.

### 7.2 `User`

Przechowuje:

- powiązanie z dostawcą OAuth,
- podstawowe dane profilu,
- rolę aplikacyjną,
- znaczniki aktywności potrzebne w panelu.

### 7.3 `Series`

Przechowuje:

- tytuł,
- slug,
- alternatywne tytuły,
- opis,
- okładkę,
- status serii,
- widoczność,
- gatunki i tagi,
- kolejność i powiązania z rozdziałami.

### 7.4 `Chapter`

Przechowuje:

- powiązanie z serią,
- numer i opcjonalny tytuł rozdziału,
- slug lub identyfikator publiczny,
- status `draft` lub `published`,
- czas publikacji,
- autora ostatniej zmiany,
- kompletność assetów.

### 7.5 `ChapterPage`

Przechowuje:

- powiązanie z rozdziałem,
- kolejność strony,
- klucz pliku w storage,
- szerokość i wysokość,
- ewentualne rozmiary pomocnicze do renderingu.

### 7.6 Zależności i reguły

- seria może istnieć bez rozdziałów,
- rozdział nie może istnieć bez serii,
- strona rozdziału nie może istnieć bez rozdziału,
- draft nie jest publicznie dostępny,
- publikacja rozdziału wymaga kompletnego zestawu stron,
- strona główna i katalog publiczny pokazują wyłącznie treści dozwolone przez status i widoczność.

### 7.7 Statusy

W v1 wystarczają dwa statusy rozdziału:

- `draft`
- `published`

Nie dokładamy statusów pośrednich, bo:

- komplikują panel,
- wymagają rozbudowanych uprawnień,
- nie są konieczne do uruchomienia wartościowego pierwszego release’u.

---

## 8. Information Architecture

### 8.1 Publiczna część serwisu

#### `/`

Strona główna skupiona na `latest chapters`.

#### `/series`

Katalog serii do przeglądania i filtrowania.

#### `/series/[slug]`

Karta serii z opisem, okładką i listą rozdziałów.

#### `/chapter/[slug-or-id]`

Reader rozdziału.

### 8.2 Część wewnętrzna

#### `/dashboard`

Główny widok panelu.

#### `/dashboard/series`

Lista i zarządzanie seriami.

#### `/dashboard/series/new`

Tworzenie nowej serii.

#### `/dashboard/series/[id]`

Edycja serii.

#### `/dashboard/chapters`

Lista rozdziałów.

#### `/dashboard/chapters/[id]`

Edycja draftu, upload, podgląd i status.

#### `/dashboard/settings`

Ustawienia instancji i brandingu.

#### `/dashboard/users`

Zarządzanie rolami.

### 8.3 Zasady IA

- publiczna część ma być maksymalnie prosta i szybka do skanowania,
- dashboard ma być zadaniowy i logicznie odseparowany od części czytelniczej,
- adresy URL mają być czytelne i SEO-friendly,
- nie budujemy skomplikowanej architektury zakładek i slotów już w v1.

---

## 9. Workflow redakcyjny

### 9.1 Tworzenie serii

1. `editor` tworzy serię.
2. Uzupełnia podstawowe dane: tytuł, slug, opis, okładkę, status, tagi.
3. Seria może zostać zapisana nawet bez rozdziałów.

### 9.2 Tworzenie rozdziału

1. `editor` dodaje nowy rozdział do wybranej serii.
2. Wprowadza numer, opcjonalny tytuł i podstawowe metadane.
3. Rozdział powstaje jako `draft`.

### 9.3 Upload stron

1. `editor` wrzuca zestaw obrazów.
2. System zapisuje pliki przez aktywny storage adapter.
3. System odczytuje metadane obrazów potrzebne do renderingu.
4. Strony dostają początkową kolejność na podstawie uploadu lub nazwy plików.
5. `editor` może ręcznie poprawić kolejność.

### 9.4 Preview

`editor` może obejrzeć wersję roboczą w układzie maksymalnie zbliżonym do finalnego readera, ale bez publicznej ekspozycji.

### 9.5 Publikacja

1. `publisher` weryfikuje gotowość rozdziału.
2. Zmienia status na `published`.
3. Rozdział pojawia się w publicznym readerze i na stronie głównej.

### 9.6 Dlaczego nie używamy bardziej rozbudowanego workflow w v1

Bo każda dodatkowa faza:

- zwiększa liczbę ról,
- zwiększa liczbę ekranów i filtrów,
- komplikuje model uprawnień,
- rozmywa podstawową wartość pierwszego release’u.

---

## 10. Rekomendowana struktura aplikacji

Poniżej znajduje się docelowy układ na poziomie architektury, nie sztywny wymóg nazw każdego pliku:

```text
app/
  (site)/
    layout.tsx
    page.tsx
    series/
      page.tsx
      [slug]/
        page.tsx
    chapter/
      [slugOrId]/
        page.tsx
  (dashboard)/
    dashboard/
      layout.tsx
      page.tsx
      series/
      chapters/
      settings/
      users/
  api/
    auth/
      [...nextauth]/
        route.ts
    health/
      route.ts
    uploads/
      route.ts
  forbidden.tsx
  unauthorized.tsx
  not-found.tsx
  global-error.tsx
  sitemap.ts
  robots.ts
  opengraph-image.tsx

app/_components/
app/_actions/
app/_lib/
```

Powody takiego układu:

- route groups rozdzielają publiczny serwis od dashboardu bez zmiany URL,
- prywatne foldery trzymają logikę poza routingiem,
- `api/` jest zarezerwowane na faktycznie potrzebne endpointy,
- struktura pozostaje czytelna dla osób, które sklonują repo i chcą je szybko zrozumieć.

---

## 11. Dlaczego Next.js tutaj

To jest kluczowy rozdział architektoniczny. Każdy mechanizm opisuje:

- co to daje,
- jak użyjemy tego w `Tsuki Manga`,
- dlaczego nie wybieramy innej opcji,
- jakie są ryzyka lub ograniczenia.

### 11.1 `app/` i App Router zamiast Pages Router

#### Co to daje

- nowoczesny model routingu oparty o segmenty,
- naturalny podział na `layout`, `page`, `loading`, `error`,
- pierwszoklasowe `Server Components`,
- lepszy model SEO i metadata API,
- wygodniejszy podział dashboardu i części publicznej.

#### Jak użyjemy w Tsuki

- cała aplikacja będzie zbudowana na `App Router`,
- publiczna część i dashboard będą rozdzielone route groups,
- dane publiczne będą renderowane głównie po stronie serwera.

#### Dlaczego nie inna opcja

`Pages Router` jest gorszym wyborem dla projektu greenfield, bo wymaga więcej warstw pośrednich i gorzej wykorzystuje zalety nowego modelu renderingu.

#### Ryzyka i ograniczenia

- App Router wymaga dyscypliny w granicach `server/client`,
- część bibliotek React może być mniej wygodna niż w klasycznym modelu CSR,
- zespół musi rozumieć różnicę między komponentami serwerowymi i klienckimi.

### 11.2 `layout.tsx`

#### Co to daje

- współdzieloną strukturę dla segmentu i jego dzieci,
- wspólne fonty, metadata templates, shell i nawigację,
- stabilny układ bez zbędnych re-renderów.

#### Jak użyjemy w Tsuki

- root `layout.tsx` ustawi fonty, podstawowy theme shell, metadata template i `viewport`,
- layout publiczny dostarczy top navigation i rytm typograficzny,
- layout dashboardu dostarczy nawigację panelową, ochronę dostępu i wspólny układ narzędziowy.

#### Dlaczego nie inna opcja

Nie chcemy powielać shelli na każdej stronie ani opierać struktury aplikacji na pojedynczym ogromnym komponencie wrapper.

#### Ryzyka i ograniczenia

- logika w layoutach musi pozostać lekka,
- zbyt dużo odpowiedzialności w layoutach utrudnia debugowanie.

### 11.3 `page.tsx`

#### Co to daje

- naturalną definicję widoków routingu,
- prosty mapping URL -> widok.

#### Jak użyjemy w Tsuki

- każda główna strona systemu dostaje własne `page.tsx`,
- strony publiczne będą preferowały `Server Components`,
- dashboard będzie mieszał server shell z mniejszymi client islands.

#### Dlaczego nie inna opcja

To podstawowy i najbardziej czytelny model App Routera.

#### Ryzyka i ograniczenia

- łatwo zrobić zbyt grube `page.tsx`; trzeba rozdzielać logikę do `_lib`, `_actions`, `_components`.

### 11.4 `loading.tsx`

#### Co to daje

- natywny loading state segmentu,
- lepsze odczucie responsywności przy streamingu.

#### Jak użyjemy w Tsuki

- dla katalogu, strony serii i części dashboardu z cięższymi listami,
- skeletony będą lekkie, bez migających „kart w kartach”.

#### Dlaczego nie inna opcja

Własne lokalne spinnery w każdym komponencie byłyby mniej spójne i bardziej chaotyczne.

#### Ryzyka i ograniczenia

- zbyt agresywne skeletony mogą sprawiać wrażenie ciężkiego UI,
- trzeba zachować zgodność z realną strukturą layoutu.

### 11.5 `error.tsx`

#### Co to daje

- segment-level error boundary,
- możliwość bezpiecznego resetu części interfejsu.

#### Jak użyjemy w Tsuki

- osobne granice błędów dla dashboardu i krytycznych sekcji publicznych,
- komunikaty muszą być spokojne i rzeczowe, bez technicznego chaosu.

#### Dlaczego nie inna opcja

Globalny crash całej aplikacji przy błędzie pojedynczego segmentu jest gorszym UX.

#### Ryzyka i ograniczenia

- `error.tsx` musi być komponentem klienckim,
- nie może stać się śmietnikiem dla całej obsługi błędów biznesowych.

### 11.6 `global-error.tsx`

#### Co to daje

- ostateczną granicę błędu dla root layoutu,
- kontrolowany fallback zamiast surowej awarii.

#### Jak użyjemy w Tsuki

- minimalistyczny ekran awaryjny z informacją, że wystąpił problem i że warto odświeżyć stronę.

#### Dlaczego nie inna opcja

Root-level failure bez `global-error.tsx` daje gorsze doświadczenie przy krytycznych awariach.

#### Ryzyka i ograniczenia

- musi zawierać `<html>` i `<body>`,
- to rozwiązanie awaryjne, nie zastępuje sensownego lokalnego error handlingu.

### 11.7 `not-found.tsx`

#### Co to daje

- spójny 404 dla nieistniejących treści,
- prostą obsługę brakującej serii lub rozdziału.

#### Jak użyjemy w Tsuki

- brakująca seria lub rozdział wywołują `notFound()`,
- 404 ma zachować charakter produktu, ale nie być przesadnie ozdobny.

#### Dlaczego nie inna opcja

Ręczne if-y zwracające pseudo-404 z kodem 200 są gorsze dla SEO i UX.

#### Ryzyka i ograniczenia

- trzeba pilnować, aby nie mylić 404 z ukrytym draftem lub brakiem uprawnień.

### 11.8 `forbidden.tsx` i `unauthorized.tsx`

#### Co to daje

- czytelny model rozróżnienia między „nie jesteś zalogowany” a „nie masz uprawnień”.

#### Jak użyjemy w Tsuki

- `/dashboard` i akcje panelowe użyją `unauthorized()` dla braku sesji,
- `forbidden()` dla zalogowanego użytkownika bez roli panelowej.

#### Dlaczego nie inna opcja

Przekierowanie wszystkiego do jednego widoku logowania zaciera ważną różnicę między auth i authorization.

#### Ryzyka i ograniczenia

- zespół musi zachować spójność semantyczną błędów 401 i 403.

### 11.9 Route groups

#### Co to daje

- logiczne grupowanie tras bez wpływu na adresy URL.

#### Jak użyjemy w Tsuki

- `(site)` dla publicznej warstwy,
- `(dashboard)` dla wewnętrznej warstwy panelowej.

#### Dlaczego nie inna opcja

Bez route groups łatwo robi się bałagan w strukturze i odpowiedzialnościach layoutów.

#### Ryzyka i ograniczenia

- wymaga czytelnej konwencji nazw i porządku w repo.

### 11.10 Private folders `_components`, `_lib`, `_actions`

#### Co to daje

- możliwość trzymania logiki i komponentów poza routingiem,
- mniejsze ryzyko przypadkowego mapowania folderu na URL.

#### Jak użyjemy w Tsuki

- `_components` dla lokalnych komponentów segmentu,
- `_lib` dla helperów, query functions i warstw domenowych,
- `_actions` dla `Server Actions`.

#### Dlaczego nie inna opcja

Trzymanie wszystkiego obok route files bez konwencji szybko robi nieczytelną strukturę.

#### Ryzyka i ograniczenia

- sama konwencja nie zastąpi dobrego podziału domenowego.

### 11.11 Dynamic segments

#### Co to daje

- naturalne URL-e dla serii i rozdziałów,
- SEO-friendly adresy.

#### Jak użyjemy w Tsuki

- `/series/[slug]`,
- `/chapter/[slugOrId]`,
- dynamiczne segmenty w dashboardzie dla edycji konkretnych rekordów.

#### Dlaczego nie inna opcja

Twarde query paramy są mniej czytelne i gorsze dla UX.

#### Ryzyka i ograniczenia

- slugi trzeba utrzymywać w spójnym i unikalnym modelu.

### 11.12 `Server Components` jako domyślny model odczytu danych

#### Co to daje

- bezpośredni dostęp do danych po stronie serwera,
- mniej waterfalli klient-serwer,
- brak ujawniania sekretów po stronie klienta,
- prostsze SEO.

#### Jak użyjemy w Tsuki

- home, katalog, karta serii i większość dashboard shell będą pobierać dane na serwerze,
- client components będą używane tylko tam, gdzie potrzebna jest interakcja.

#### Dlaczego nie inna opcja

CSR-first byłby gorszy dla self-hostingu, wydajności, SEO i prostoty implementacji.

#### Ryzyka i ograniczenia

- komponenty serwerowe nie mogą mieć browser-only logiki,
- trzeba uważać na przekazywanie serializowalnych propsów do client components.

### 11.13 `'use client'`

#### Co to daje

- możliwość użycia hooków, event handlerów i browser APIs.

#### Jak użyjemy w Tsuki

- uploader plików,
- drag and drop do kolejności stron,
- filtry katalogu z natychmiastową reakcją,
- część interakcji dashboardu,
- ograniczony motion.

#### Dlaczego nie inna opcja

Nie każdy komponent potrzebuje klienta. W Tsuki będziemy używać `'use client'` punktowo, a nie globalnie.

#### Ryzyka i ograniczenia

- zbyt wiele client components zwiększa bundle,
- łatwo przenieść do klienta rzeczy, które powinny zostać na serwerze.

### 11.14 `Server Actions` i `'use server'`

#### Co to daje

- typowany model mutacji bez budowania dodatkowego REST API,
- prosty przepływ dla formularzy i akcji panelowych,
- dobra integracja z revalidation i nawigacją.

#### Jak użyjemy w Tsuki

- tworzenie i edycja serii,
- zapis draftów rozdziałów,
- zmiana statusu na `published`,
- aktualizacja ustawień instancji,
- zarządzanie rolami.

#### Dlaczego nie inna opcja

Budowanie pełnego API dla wszystkich mutacji dashboardu w v1 byłoby nadmiarem pracy i konfiguracji.

#### Ryzyka i ograniczenia

- `Server Actions` są przeznaczone dla wewnętrznego UI, nie dla integracji zewnętrznych,
- trzeba pilnować autoryzacji w każdej akcji,
- nie należy łapać `redirect()` lub `notFound()` w sposób, który zatrzyma nawigację.

### 11.15 `Route Handlers`

#### Co to daje

- API endpoints tam, gdzie naprawdę są potrzebne,
- obsługę webhooków, healthchecków i zewnętrznych integracji.

#### Jak użyjemy w Tsuki

- `app/api/auth/[...nextauth]/route.ts`,
- `app/api/health/route.ts`,
- ewentualny endpoint uploadu dla bardziej zaawansowanych scenariuszy przesyłania plików,
- ewentualne webhooki integracyjne później.

#### Dlaczego nie inna opcja

Nie chcemy używać `Route Handlers` do wszystkiego. Wewnętrzne mutacje panelu zostają w `Server Actions`.

#### Ryzyka i ograniczenia

- `route.ts` nie może współistnieć z `page.tsx` w tym samym folderze dla tego samego segmentu,
- łatwo zbudować pół-backendu REST bez realnej potrzeby.

### 11.16 `generateMetadata`

#### Co to daje

- dynamiczne SEO i tytuły zależne od konkretnej serii lub rozdziału,
- lepsze link previews i czytelniejsze tytuły stron.

#### Jak użyjemy w Tsuki

- strona serii generuje metadata z tytułu, opisu i okładki,
- strona rozdziału generuje title i canonical w oparciu o serię i numer rozdziału,
- root layout dostarczy template `%s | Nazwa instancji`.

#### Dlaczego nie inna opcja

Stałe metadata dla content-heavy serwisu byłyby zbyt ubogie i gorsze dla SEO.

#### Ryzyka i ograniczenia

- metadata działają po stronie serwera,
- jeśli ta sama dana jest potrzebna do renderu i metadata, trzeba unikać podwójnych fetchy, np. przez `cache()`.

### 11.17 `viewport`

#### Co to daje

- spójną kontrolę nad mobile renderingiem i `theme-color`.

#### Jak użyjemy w Tsuki

- globalny `viewport` w root layout,
- ewentualny dynamiczny `themeColor` zależny od brandingu instancji tylko wtedy, gdy nie skomplikuje niepotrzebnie root shell.

#### Dlaczego nie inna opcja

To standardowy, czytelny punkt konfiguracji dla App Router.

#### Ryzyka i ograniczenia

- nie należy mieszać tej konfiguracji z logiką stricte komponentową.

### 11.18 `sitemap.ts` i `robots.ts`

#### Co to daje

- sensowną podstawę SEO dla samohostowanej instancji,
- prostą kontrolę nad indeksowaniem.

#### Jak użyjemy w Tsuki

- `robots.ts` z podstawowymi dyrektywami,
- `sitemap.ts` generujący mapę dla home, katalogu, serii i opublikowanych rozdziałów.

#### Dlaczego nie inna opcja

Na start nie potrzebujemy `generateSitemaps`, bo rozmiar katalogu nie wymaga dzielenia map na wiele plików.

#### Ryzyka i ograniczenia

- trzeba pilnować, aby sitemap obejmował wyłącznie publiczne treści.

### 11.19 OG image conventions i `opengraph-image.tsx`

#### Co to daje

- spójne preview linków w social media i komunikatorach.

#### Jak użyjemy w Tsuki

- globalny `opengraph-image.tsx` dla instancji,
- później możliwość dynamicznego OG dla serii, jeśli będzie to potrzebne.

#### Dlaczego nie inna opcja

Pliki statyczne są prostsze, ale dla produktu contentowego warto mieć możliwość generacji obrazków zgodnych z brandingiem.

#### Ryzyka i ograniczenia

- generowanie OG nie powinno wymagać Edge runtime,
- trzeba uważać na koszty złożonych layoutów graficznych.

### 11.20 `next/image`

#### Co to daje

- optymalizację obrazów,
- responsywne rozmiary,
- kontrolę layout shift,
- lazy loading.

#### Jak użyjemy w Tsuki

- okładki serii,
- miniatury i karty latest chapters,
- dashboard preview assets,
- brandingowe obrazy statyczne.

#### Dlaczego nie wszędzie

W pełnym readerze rozdziału nie używamy `next/image` jako jedynej strategii dla długiego strumienia bardzo wysokich stron. Tam ważniejsze są:

- przewidywalny rendering długich obrazów,
- niższy koszt CPU po stronie self-hosted serwera,
- prosty direct delivery z aktywnego storage,
- kontrola lazy loadingu i rozmiarów na podstawie zapisanych metadanych.

#### Ryzyka i ograniczenia

- `next/image` wymaga sensownej konfiguracji `remotePatterns`,
- bez `sizes` łatwo pobierać obrazy zbyt ciężkie,
- dla pełnych chapter pages trzeba pilnować wydajności długich list obrazów.

### 11.21 `next/font`

#### Co to daje

- self-hosted loading fontów,
- mniejszy layout shift,
- lepszą kontrolę typografii bez ręcznych `<link>`.

#### Jak użyjemy w Tsuki

- dwa główne fonty:
  - `Newsreader` lub `Lora` dla tytułów i akcentów editorialnych,
  - `Raleway` dla warstwy interfejsu i tekstów pomocniczych,
- fonty będą wstrzykiwane przez root layout i mapowane do zmiennych CSS/Tailwind tokens.

#### Dlaczego nie inna opcja

Ręczne ładowanie fontów z Google Fonts przez `<link>` jest gorsze dla wydajności i spójności self-hostu.

#### Ryzyka i ograniczenia

- nie można przesadzić z liczbą rodzin i wag,
- reader nie może być zbyt „stylizowany”; typografia ma wspierać treść, nie dominować.

### 11.22 `next/dynamic`

#### Co to daje

- code splitting cięższych modułów,
- mniejszy bundle początkowy.

#### Jak użyjemy w Tsuki

- drag-and-drop uploader,
- bardziej złożone narzędzia dashboardu,
- moduły używane wyłącznie po zalogowaniu.

#### Dlaczego nie inna opcja

Nie chcemy ładować ciężkiego dashboard tooling do publicznej części czytniczej.

#### Ryzyka i ograniczenia

- nadmierne używanie `dynamic()` może skomplikować loading states,
- trzeba uważać na SSR i zależności browser-only.

### 11.23 `cookies()` i `headers()`

#### Co to daje

- dostęp do kontekstu requestu po stronie serwera,
- możliwość bezpiecznego odczytu sesji i nagłówków.

#### Jak użyjemy w Tsuki

- obsługa auth i sesji,
- ewentualna personalizacja drobnych zachowań requestu,
- bez budowania niepotrzebnej logiki po stronie klienta.

#### Dlaczego nie inna opcja

Nie chcemy przenosić logiki sesyjnej do client-side state management.

#### Ryzyka i ograniczenia

- użycie tych funkcji może wymuszać dynamiczne renderowanie segmentu,
- trzeba stosować je tylko tam, gdzie faktycznie są potrzebne.

### 11.24 `redirect`, `notFound`, `unauthorized`, `forbidden`

#### Co to daje

- jawny i semantyczny model przejść oraz błędów.

#### Jak użyjemy w Tsuki

- `redirect()` po udanych akcjach panelowych,
- `notFound()` dla brakujących rekordów publicznych,
- `unauthorized()` dla braku sesji,
- `forbidden()` dla braku roli.

#### Dlaczego nie inna opcja

Ręczne zarządzanie kodami i stanami w komponentach jest mniej czytelne i łatwiej prowadzi do niespójności.

#### Ryzyka i ograniczenia

- tych wywołań nie wolno nieprawidłowo opakować w `try/catch` w `Server Actions`.

### 11.25 Node runtime zamiast Edge

#### Co to daje

- pełne API `Node.js`,
- lepszą zgodność z auth, bazą danych, uploadem i storage,
- większą przewidywalność self-hostingu.

#### Jak użyjemy w Tsuki

- cały projekt przyjmuje `Node.js runtime` jako domyślny,
- nie deklarujemy `runtime = 'edge'` dla standardowych tras.

#### Dlaczego nie inna opcja

Edge runtime jest tu słabszy, bo:

- ogranicza dostęp do części API i bibliotek,
- komplikuje obsługę plików i storage,
- nie wnosi wystarczającej wartości dla self-hosted readera.

#### Ryzyka i ograniczenia

- jeśli kiedyś pojawi się potrzeba geograficznie bliskiego edge delivery, trzeba będzie tę decyzję przeglądnąć dla wybranych tras.

### 11.26 `output: 'standalone'`

#### Co to daje

- prostszy, lżejszy deployment w kontenerze,
- czytelny target dla self-hostingu.

#### Jak użyjemy w Tsuki

- `next.config` będzie ustawiony pod `standalone`,
- obraz Dockera skopiuje `.next/standalone`, `.next/static` i `public`.

#### Dlaczego nie inna opcja

To najbardziej naturalny wybór dla projektu z priorytetem `Docker-first`.

#### Ryzyka i ograniczenia

- trzeba pilnować poprawnego kopiowania assetów i konfiguracji środowiska w obrazie produkcyjnym.

---

## 12. Mechanizmy Next.js świadomie nieużywane lub odłożone

### 12.1 `draftMode`

Nie używamy go jako głównego mechanizmu preview, bo:

- mamy własny model `draft` w bazie,
- potrzebujemy workflow redakcyjnego, nie prostego podglądu CMS,
- logika publikacji ma wynikać ze statusów domenowych, nie z trybu przeglądarki.

### 12.2 `generateStaticParams`

Nie używamy go jako głównego mechanizmu dla serii i rozdziałów, bo:

- treść często się zmienia,
- self-hostowana instancja ma być prosta operacyjnie,
- nie chcemy komplikować życia wokół statycznego prebuildingu treści dynamicznych.

### 12.3 `generateSitemaps`

Odkładamy do momentu, gdy katalog będzie tak duży, że pojedynczy `sitemap.ts` przestanie być wygodny.

### 12.4 Parallel routes

Nie są potrzebne w v1, bo:

- nie mamy złożonego, wieloslotowego shellu,
- zwiększają narzut poznawczy,
- nie rozwiązują teraz żadnego realnego problemu produktu.

### 12.5 Intercepting routes

Nie są potrzebne w v1, bo:

- nie budujemy modalowego systemu nawigacji wokół treści,
- zwykłe trasy są prostsze i bardziej przewidywalne.

### 12.6 `proxy.ts` lub `middleware.ts`

W v1 nie opieramy ochrony dashboardu na globalnym proxy layer, bo:

- lepiej sprawdza się kontrola dostępu w dashboard layout i server mutations,
- zmniejszamy rozproszenie logiki auth,
- unikamy wrażliwych zależności od runtime proxy.

Można wrócić do tej decyzji później, np. dla prostych rewrites, rate-limitingu albo URL normalization.

### 12.7 `after()`

Odkładamy użycie do momentu, gdy pojawi się realna potrzeba post-response side effects, np. analityki lub logów asynchronicznych. W v1 nie jest to funkcja rdzeniowa.

### 12.8 `connection()`

Nie planujemy użycia w v1, bo projekt nie wymaga specjalnego sterowania momentem dynamicznego renderowania na tym poziomie.

### 12.9 `'use cache'`

Nie wprowadzamy go na start jako osi architektury, bo:

- projekt ma być prosty do zrozumienia,
- najpierw stawiamy czytelny model danych i revalidation,
- dodatkowa strategia cache może wejść później, gdy realnie pojawi się problem wydajnościowy.

### 12.10 Edge runtime

Odrzucony z powodów opisanych wyżej: self-host, auth, storage i przewidywalność są ważniejsze niż potencjalna latencja edge.

### 12.11 Multi-instance ISR cache handlers

Odkładamy do momentu, gdy jedna instancja będzie uruchamiana jako wiele replik z load balancerem. V1 zakłada jeden kontener aplikacji i prosty model cache.

---

## 13. UI/UX System

### 13.1 Kierunek wizualny

Warstwa wizualna opiera się na połączeniu dwóch kierunków:

- `E-Ink / Paper` jako baza czytelnicza i tonalna,
- `Swiss Modernism 2.0` jako baza siatki, rytmu i organizacji treści.

Przekłada się to na następujące decyzje:

- tło ma przypominać spokojną, papierową powierzchnię, nie sterylny bielik,
- treść ma oddychać przez przestrzeń, nie przez mnożenie ramek,
- układ ma być uporządkowany i modularny, ale nie zimny,
- najważniejsze elementy mają wynikać z typografii i rytmu, nie z kolejnych kontenerów.

### 13.2 Główne zasady wizualne

- maksymalnie jedna widoczna warstwa karty w danym obszarze,
- brak `box in box in box`,
- brak ciężkiego glassmorphism,
- brak gradientów,
- brak ciemnego motywu jako domyślnego trybu,
- brak ozdobnych animacji przeszkadzających w czytaniu.

### 13.3 Paleta kolorystyczna

#### Kolory bazowe

- tło główne: ciepły off-white z rodziny `#FDFBF7`,
- powierzchnie pomocnicze: jasne neutralne szarości i papierowe biele,
- tekst główny: bardzo ciemny neutral z wysokim kontrastem,
- bordery: delikatne, ale czytelne neutralne linie.

#### Kolor akcentu

Instancja może ustawić jeden kolor akcentu dla:

- CTA,
- fokusów,
- aktywnych stanów,
- drobnych elementów brandingu.

Akcent nie może zamienić strony w kolorowy portal. Ma tylko prowadzić oko.

Kolor powinien być stosowany jako płaska, spokojna powierzchnia. Nie używamy gradientów jako tła sekcji, kart, hero, przycisków ani dekoracyjnych przejść kolorystycznych.

### 13.4 Typografia

Zalecany system:

- nagłówki: `Newsreader` lub `Lora`,
- UI i tekst pomocniczy: `Raleway`,
- opcjonalny monospace dla technicznych drobiazgów panelu.

Powód wyboru:

- serif w nagłówkach daje lekko editorialny, spokojny ton,
- sans dla UI zachowuje nowoczesność i czystość,
- całość jest bardziej charakterystyczna niż domyślny stack w stylu `Inter everywhere`.

### 13.5 Spacing i gęstość

- layout oparty o regularny rytm odstępów,
- szerokości kontenerów ograniczone tak, by treść nie rozlewała się zbyt szeroko,
- listy i tabele panelowe mają być zwarte, ale nie ciasne,
- reader ma mieć szerokość podporządkowaną wygodzie czytania długich pionowych stron.

### 13.6 Motion

Dozwolony motion:

- krótkie przejścia `150-300ms`,
- transform i opacity zamiast ciężkich layout animations,
- delikatne reveal na home,
- subtelna reakcja hover/focus.

Zakazy:

- długie, dekoracyjne parallaxe,
- animacje przeszkadzające w scrollowaniu readera,
- efektowne page transitions kosztem czytelności.

Wszystko musi respektować `prefers-reduced-motion`.

### 13.7 Dostępność

- czytelny kontrast,
- widoczny `focus-visible`,
- touch targets minimum `44x44`,
- pełne `alt` tam, gdzie obraz niesie informację,
- semantyczne HTML dla nawigacji i struktury,
- brak polegania wyłącznie na kolorze,
- logiczna kolejność tabowania.

---

## 14. Opis UI per obszar

### 14.1 Home

Home ma promować aktywność grupy, a nie być statyczną wizytówką.

Decyzje:

- hero ma być editorial i spokojny, bez „startupowego” nadęcia,
- pierwszy mocny blok to najnowsze rozdziały,
- wyróżnione serie mogą istnieć, ale nie mogą wypychać `latest chapters`,
- całość ma szybko prowadzić użytkownika do czytania.

Dlaczego tak:

- powracający czytelnik przychodzi po nowe rozdziały,
- nowa publikacja jest głównym sygnałem życia grupy,
- home nie może być przeszkodą między wejściem a treścią.

### 14.2 Catalog

Katalog ma służyć szybkiemu skanowaniu listy serii.

Decyzje:

- prosty grid lub lista z czytelną typografią,
- lekkie okładki i metadane,
- filtry i wyszukiwarka bez rozbudowanego chrome,
- brak ciężkich, wielowarstwowych kart.

Dlaczego tak:

- użytkownik chce szybko przejść po tytułach,
- katalog nie powinien wyglądać jak marketplace z dziesiątkami kapsuł.

### 14.3 Series page

Strona serii ma łączyć opis, okładkę i listę rozdziałów w jednej czytelnej hierarchii.

Decyzje:

- okładka i podstawowe meta obok lub nad opisem,
- chapter list jako najmocniejszy element użytkowy,
- opis nie może zagłuszać listy rozdziałów,
- statusy i tagi mają być subtelne.

Dlaczego tak:

- głównym zadaniem tej strony jest wejście w rozdział,
- opis jest ważny, ale użytkowo wtórny wobec chapter listy.

### 14.4 Reader

Reader jest najważniejszym widokiem całego produktu.

Decyzje:

- maksimum prostoty,
- minimum chrome,
- bardzo spokojne tło,
- czytelna nawigacja między poprzednim i następnym rozdziałem,
- obrazy dominują, interfejs usuwa się w cień.

Dlaczego tak:

- wszystko, co odwraca uwagę od stron rozdziału, szkodzi produktowi,
- reader ma sprawiać wrażenie lekkości, nie panelu sterowania.

### 14.5 Dashboard

Dashboard ma być narzędziowy i szybki.

Decyzje:

- klarowna nawigacja boczna lub górna,
- mocny nacisk na listy, statusy i formularze,
- proste komunikaty systemowe,
- brak marketingowego hero i zbędnych dekoracji,
- ten sam język wizualny co publiczna część, ale większa gęstość informacji.

Dlaczego tak:

- zespół ma wykonywać zadania, nie podziwiać layout,
- panel ma być czytelny po wielu godzinach pracy.

---

## 15. Anti-patterns

Poniższe zachowania są w tym projekcie uznane za błędne kierunki projektowe:

- boxy wewnątrz boxów wewnątrz boxów,
- dashboard wyglądający jak panel analityczny SaaS bez związku z produktem,
- agresywny glassmorphism,
- gradienty w hero, tłach, kartach, przyciskach lub separatorach,
- ciężkie cienie i wielopiętrowe obramowania,
- wymuszony dark mode jako główna tożsamość,
- przesadne mikroanimacje,
- gigantyczne hero odsuwające najnowsze rozdziały poza pierwszy ekran,
- katalog zamieniony w ścianę ciężkich kafli,
- reader z oblepionym interfejsem i ozdobnikami.

---

## 16. Self-hosting i operacyjność

### 16.1 Model wdrożenia

Priorytetem jest `Docker-first self-hosting`.

V1 ma być gotowe do uruchomienia przez:

- aplikację `Next.js`,
- `PostgreSQL`,
- wolumen trwały dla uploadów lokalnych,
- prostą konfigurację `.env`.

### 16.2 `output: 'standalone'`

Aplikacja ma budować się do `standalone`, bo to najlepiej wspiera:

- mały obraz produkcyjny,
- prostszy deployment,
- czytelniejszy Dockerfile.

### 16.3 Local storage jako default

Domyślny pierwszy start powinien używać lokalnego storage, bo:

- nie wymaga zewnętrznego bucketu,
- daje najniższy próg wejścia,
- jest naturalny dla małych i średnich instalacji.

### 16.4 `S3-compatible` jako tryb produkcyjny

Drugim wspieranym trybem jest `S3-compatible`, bo:

- lepiej wspiera większe instancje,
- ułatwia backupy i zewnętrzne storage,
- jest kompatybilny z popularnymi usługami i MinIO.

### 16.5 Reguła adaptera storage

Warstwa aplikacji nie może „wiedzieć”, czy plik leży lokalnie, czy w S3. Ma pracować na wspólnym interfejsie storage.

### 16.6 Zmienne środowiskowe

Minimalny zestaw konfiguracyjny powinien obejmować:

- URL aplikacji,
- connection string bazy,
- sekret auth,
- dane OAuth providera,
- wybór drivera storage,
- konfigurację local lub S3,
- listę bootstrap adminów.

### 16.7 Healthcheck

`/api/health` powinno istnieć od początku, bo:

- upraszcza `docker compose`,
- wspiera prostą obserwowalność,
- jest małym kosztem, a dużą wygodą.

### 16.8 Skala v1

V1 zakłada pojedynczą instancję aplikacji. Jeśli kiedyś pojawi się wiele replik za load balancerem, trzeba wrócić do polityki cache i ISR.

---

## 17. Testy i akceptacja v1

### 17.1 Auth i role

- logowanie przez OAuth tworzy konto `reader`,
- konto bez roli panelowej nie wchodzi do `/dashboard`,
- `editor`, `publisher` i `admin` mają dokładnie przypisane możliwości,
- `forbidden` i `unauthorized` działają zgodnie z semantyką.

### 17.2 Treść i publikacja

- można utworzyć serię,
- można utworzyć draft rozdziału,
- można dodać strony i zmienić ich kolejność,
- draft nie jest publiczny,
- publikacja przenosi rozdział do części publicznej,
- homepage pokazuje najnowszy opublikowany rozdział.

### 17.3 Storage

- ten sam flow działa dla `local` i `S3-compatible`,
- aplikacja poprawnie renderuje okładki i strony,
- błędny upload nie psuje opublikowanego rozdziału,
- metadata wymiarów obrazów są zachowane.

### 17.4 UI i responsywność

- brak poziomego scrolla na mobile,
- reader pozostaje wygodny na telefonie i desktopie,
- fokusy są widoczne,
- latest chapters są dostępne natychmiast po wejściu na home,
- panel zachowuje czytelność przy dłuższej pracy.

### 17.5 Self-hosting

- świeże repo daje się uruchomić według instrukcji,
- po restarcie kontenerów baza i uploady nie znikają,
- podstawowy healthcheck przechodzi,
- instancja daje się skonfigurować bez edycji kodu.

---

## 18. Decyzje wdrożeniowe dla kolejnego etapu

Ten dokument zostawia bardzo mało swobody interpretacyjnej. Implementacja powinna przyjąć jako ustalone:

- `Next.js monolith`,
- `App Router`,
- `Node.js runtime`,
- `PostgreSQL`,
- `Auth.js + OAuth`,
- public sign-in z ręcznym nadawaniem ról panelowych,
- role `reader`, `editor`, `publisher`, `admin`,
- workflow `draft -> publish`,
- `local` i `S3-compatible` storage,
- publiczny home oparty o `latest chapters`,
- UI w kierunku paper-like editorial minimalism,
- `Docker-first` deployment,
- `standalone output`.

---

## 19. Otwarta ścieżka rozwoju po v1

Te elementy są sensowne w przyszłości, ale nie wchodzą do v1:

- bardziej rozbudowane role produkcyjne,
- wieloetapowy workflow jakościowy,
- komentarze i interakcje społeczne,
- wielojęzyczne instancje,
- publiczne API,
- bardziej zaawansowane SEO i dynamiczne OG per chapter,
- rozproszony cache dla wielu instancji,
- bardziej rozbudowane statystyki redakcyjne.

To są kierunki rozwoju, nie zaległości v1.

---

## 20. Podsumowanie

`Tsuki Manga` ma być platformą o bardzo świadomym kompromisie: prostą do uruchomienia, nowoczesną, estetyczną i skupioną na czytaniu oraz publikacji. `Next.js` jest tu wybrane nie dlatego, że jest modne, tylko dlatego, że pozwala połączyć publiczny reader, panel, SEO, auth i self-hosting w jednym spójnym runtime. Warstwa UI ma być elegancka, ale wycofana; panel ma być zadaniowy, a reader ma oddawać pierwszy plan treści.

Jeżeli późniejsza implementacja będzie trzymała się tego dokumentu, powinna dać produkt spójny technologicznie, wizualnie i operacyjnie.
