# Tsuki Manga

## Decision log ustaleń Phase 2

Data: 2026-04-01  
Status: roboczy log decyzji  
Język dokumentu: polski

## Cel pliku

Ten plik jest krótkim, roboczym source-of-truth dla ustaleń z drugiej fazy doprecyzowania projektu. Nie zastępuje master specu i nie próbuje powielać całej architektury. Jego celem jest szybkie zapisanie decyzji, które zapadły w rozmowie, żeby mogły być użyte jako wejście do kolejnego technicznego implementation planu.

Główny dokument produktu nadal znajduje się w:

- `docs/plans/2026-04-01-tsuki-manga-platform-design.md`

---

## Ustalone decyzje

### Stack i narzędzia

- ORM projektu: `Prisma`
- package manager: `pnpm`
- stack testowy: `Vitest + Playwright`
- minimalny zakres CI: `lint + typecheck + testy`

### Auth i konta

- startowy provider OAuth: `Discord`
- warstwa auth ma być przygotowana na łatwe dodanie kolejnych providerów w przyszłości
- bootstrap pierwszego admina odbywa się po `provider account id`
- nie używamy emaili użytkowników do bootstrapu ani jako kluczowego elementu modelu admina
- konto czytelnika w v1 nie dostaje dodatkowych funkcji społecznościowych ani profilu użytkowego poza samym auth

### URL-e i identyfikatory

- publiczne URL-e rozdziałów używają modelu `ID + slug`
- identyfikatory encji mają używać `UUID`
- slugi są generowane automatycznie, ale można je ręcznie edytować
- historia starych slugów ma prowadzić do redirectów
- slugów nie reużywamy

### Serie i rozdziały

- widoczność serii w v1: `public / hidden`
- ukrycie serii powoduje, że seria i jej rozdziały znikają publicznie
- sortowanie rozdziałów:
  - publicznie malejąco
  - w panelu rosnąco
- numeracja rozdziałów: `number + optional label`
- publikacja działa jako `publish now`
- cofnięcie publikacji przywraca rozdział do statusu `draft`
- usuwanie treści opiera się na `soft delete`
- `soft delete` serii automatycznie soft-delete'uje jej rozdziały
- restore serii z kosza przywraca serię jako `hidden`
- restore serii z kosza przywraca jej rozdziały jako `draft`
- jeśli przy restore pojedynczego rozdziału jego seria nadal jest usunięta, UI ma poinformować o tym użytkownika i zapytać, czy również przywrócić serię
- kosz ma być osobny dla serii i osobny dla rozdziałów
- assety po soft delete zostają w storage do ręcznego lub przyszłego cleanupu

### Upload i obrazy

- podstawowy flow uploadu rozdziału: wiele obrazów naraz
- dozwolone formaty: `PNG`, `JPG/JPEG`, `WebP`
- limit uploadu:
  - `40 MB` na pojedynczy plik
  - `2 GB` na cały rozdział
- przetwarzanie obrazów w v1 obejmuje tylko walidację i zapis metadata
- nie generujemy pełnych wariantów obrazów ani szerokiego pipeline’u optymalizacji

### Preview i delivery assetów

- preview draftów działa tylko w dashboardzie
- assety draftów są dostarczane przez aplikację po autoryzacji
- assety opublikowanych rozdziałów są dostarczane bezpośrednio ze storage

### Katalog i taksonomia

- wyszukiwanie katalogu obejmuje `title + alt titles + tagi`
- taksonomia działa jako jedna tabela z typem `genre/tag`
- słownik tagów i gatunków jest zarządzany w panelu
- tagi i gatunki są usuwane przez `hard delete`
- usunięcie tagu lub gatunku ma być dozwolone nawet wtedy, gdy jest używany przez serie
- przy takim usunięciu system ma wyświetlić stosowny komunikat i odpiąć powiązania

### Uprawnienia i role

- model uprawnień ma być technicznie oparty o bity
- UX panelu nadal opiera się na presetach ról
- minimalny zestaw permission flags:
  - `Users`
  - `Settings`
  - `Taxonomy`
  - `Series`
  - `Chapters`
  - `Publish`
- presety ról pozostają produktowo czytelne:
  - `Reader`
  - `Editor`
  - `Publisher`
  - `Admin`
- `Reader` ma pustą maskę uprawnień i brak dostępu do dashboardu
- `Editor` mapuje się na `Series + Chapters + Settings`
- `Editor` nie ma `Users`, `Taxonomy`, `Publish` ani prawa do delete
- preset `Publisher` mapuje się jako `Editor + Publish`
- `Publisher` nie ma `Users` ani `Taxonomy`
- `Admin` ma wszystkie flagi
- `Users` jest zarezerwowane wyłącznie dla `Admin`
- użytkownik nie może eskalować własnych uprawnień przez zarządzanie użytkownikami
- `Settings` oznacza wyłącznie edycję publicznych ustawień instancji, nie konfiguracji operacyjnej z `env`
- `Series` i `Chapters` obejmują pracę na treści, ale nie dają prawa do delete

### `InstanceSettings`

- `InstanceSettings` przechowuje tylko publiczne ustawienia produktu, nie operacyjne konfiguracje
- rzeczy operacyjne, takie jak timezone czy storage driver, pozostają w `env`
- hero strony głównej używa nazwy grupy jako głównego napisu
- opis grupy jest opcjonalnym polem i może być użyty na home pod nazwą grupy
- homepage pozostaje data-driven; nie budujemy z `InstanceSettings` mini-CMS dla sekcji home
- logo jest opcjonalne
- favicon jest opcjonalne
- logo i favicon są uploadowanymi assetami
- logo i favicon korzystają z tego samego storage drivera co reszta plików, ale mogą mieć osobną logiczną kategorię assetów
- zmiana logo lub favicon nadpisuje poprzedni asset zamiast trzymania historii wersji
- kolory brandingu nie są trzymane w bazie ani panelu; theme pozostaje po stronie kodu i konfiguracji stylów
- `site title` jest osobnym polem niezależnym od nazwy grupy
- `site description` jest osobnym polem niezależnym od opcjonalnego opisu grupy
- `keywords` są przechowywane jako lista stringów
- globalne SEO defaults z `InstanceSettings` są używane na stronie głównej i jako fallback dla metadata
- strony serii i rozdziałów nadpisują metadata dynamicznie
- `social links` są elastyczną listą elementów bez pola order
- każdy `social link` ma `label`, `url` i `icon`
- `icon` może być predefiniowanym typem lub surowym stringiem SVG
- jeśli dostępny jest custom SVG, ma pierwszeństwo nad predefiniowaną ikoną
- wszystko z `InstanceSettings` może edytować każdy preset lub użytkownik mający permission `Settings`

### Instancja i operacyjność

- jedna strefa czasu na instancję
- strefa czasu jest konfiguracją operacyjną
- strefa czasu nie jest trzymana w `InstanceSettings`
- strefa czasu pochodzi z opcjonalnego `APP_TIMEZONE` z fallbackiem do `UTC`
- v1 działa jako jeden język UI na instancję
- struktura tekstów ma być przygotowana pod łatwe i18n w przyszłości
- backupy w v1 są rozwiązywane jako runbook i zalecenia operacyjne, bez osobnego UI backupu
- oficjalny deployment używa `docker compose`
- compose ma wspierać pełniejszy układ:
  - domyślny setup dla `local storage`
  - opcjonalny profil `minio` dla `S3-compatible`
  - osobny profil lub wariant testowy dla `app + postgres`
- `minio` jest opcjonalne
- `local storage` pozostaje domyślnym trybem po świeżym klonie repo
- storage wybieramy jawnie przez przełącznik `STORAGE_DRIVER=local|s3`
- dla `local storage` używamy stałej ścieżki w kontenerze zamiast konfigurowalnego path env
- bootstrap admina w env używa pojedynczego `provider account id` na start
- po pierwszym logowaniu bootstrap-admina dalsze nadawanie ról odbywa się już z panelu
- `APP_URL`, jeśli jest ustawione, zawsze wygrywa nad hostem z requestu przy generowaniu canonicali, callbacków auth i metadata
- jeśli `APP_URL` nie jest ustawione, aplikacja może używać fallbacku do hosta z requestu
- `S3_PUBLIC_BASE_URL` jest jawnie konfigurowane zamiast wyliczane automatycznie
- `.env.example` ma obejmować wszystkie tryby wraz ze zmiennymi testowego auth flow
- testowy provider auth jest domyślnie wyłączony
- testowy provider auth aktywuje się wyłącznie przez dedykowaną env flagę
- ten sam testowy provider może działać w środowisku testowym i lokalnym dev, jeśli flaga jest jawnie ustawiona
- `docker compose` ma mieć healthchecki dla `app`, `postgres` i opcjonalnego `minio`

### Testy

- integration tests mają obejmować dokładnie:
  - auth i permissions
  - CRUD serii i rozdziałów
  - publish i unpublish
  - zachowanie storage adapterów
- integration tests mają działać z prawdziwą testową bazą `PostgreSQL`
- testy storage adapterów mogą być osobne dla `local` i `s3`, nie muszą używać jednego współdzielonego kontraktu testowego
- minimalne E2E obejmują:
  - logowanie i brak dostępu bez roli
  - editor tworzy serię i draft rozdziału
  - publisher publikuje rozdział
  - rozdział pojawia się publicznie
- minimalne E2E uruchamiamy tylko na `local storage`
- `S3-compatible` ma być pokryte przez integration tests
- E2E auth używa testowego provider/mocked auth flow, nie prawdziwego Discord OAuth

### UI i UX

- kierunek strony głównej: `hybryda`
- hero strony głównej:
  - używa nazwy grupy jako głównego napisu
  - może pokazywać opcjonalny opis grupy
  - na desktopie ma mieć chmurę okładek wokół centralnego napisu
  - chmura okładek ma reagować bardzo lekkim parallaxem
  - na mobile hero nie pokazuje chmury okładek
  - na mobile po hero użytkownik ma szybko zobaczyć treść
- homepage ma sekcję `Najnowsze aktualizacje`
- sekcja `Najnowsze aktualizacje`:
  - pokazuje okładki jako główny nośnik wizualny
  - nie używa badge'y ani overlayów
  - ma subtelną etykietę pod okładką
  - kliknięcie z tej sekcji prowadzi na stronę serii, nie bezpośrednio do rozdziału
- pełny katalog serii pozostaje osobno pod `/series`
- widok `/series`:
  - główny layout to grid okładek
  - typografia pod okładkami ma być bardzo oszczędna
  - wyszukiwarka jest widoczna od razu
  - dodatkowe filtry są schowane pod przyciskiem
- strona pojedynczej serii:
  - ma pionowy układ zarówno na desktopie, jak i mobile
  - pokazuje rozdziały oraz krótki opis
  - dłuższy opis jest zwijany
  - lista rozdziałów ma być lekko podzieloną listą wierszy
- reader:
  - ma prawie zerowy chrome
  - pokazuje tylko tytuł, nawigację i wybór stylu czytania
  - wspiera obowiązkowo trzy tryby:
    - `webtoon`
    - klasyczny pionowy
    - `right-to-left`
  - preferencja stylu czytania zapisuje się hybrydowo:
    - lokalnie dla wszystkich
    - dla zalogowanych także na koncie
  - tryb `right-to-left` zmienia tylko kolejność stron
  - logika przechodzenia między chapterami pozostaje zwykła
  - nawigacja chapterów ma być dostępna na górze i dole
  - tło readera ma być bardzo delikatnie papierowe
- dashboard:
  - układ `sidebar po lewej + content`
  - sidebar używa tekstu i ikon
  - listy serii i rozdziałów mają mieć wyraźne kolumny, ale bez ciężkiego enterprise table
  - formularze mają mieć model `mix`
  - większe edycje i upload pozostają na osobnych stronach
  - mniejsze akcje mogą używać `drawer`
  - UI uploadu rozdziału to `dropzone + lista miniatur`
  - statusy są pokazywane jako małe pills/tagi
  - w widokach panelowych jedna akcja jest główna, reszta ma być spokojniejsza wizualnie
- okładki serii są mocnym elementem wizualnym całego produktu
- domyślna proporcja okładek pozostaje klasycznie pionowa, właściwa dla mangi
- aplikacja wspiera opcjonalny dark mode dla całego produktu
- dark mode:
  - pozostaje wtórny wobec jasnego trybu jako tożsamości produktu
  - używa trybów `system`, `light`, `dark`
  - zapisuje wybór lokalnie, a dla zalogowanych również na koncie
  - jest przełączany z publicznego headera

### Architektura `Next.js`

- aplikacja pozostaje `Next.js monolith` z `App Router`
- routing ma być rozdzielony na:
  - publiczną część `site`
  - wewnętrzną część `dashboard`
  - cienką warstwę `api`
- preferowany układ katalogów:
  - `app/(site)/` dla home, katalogu, strony serii i readera
  - `app/(dashboard)/dashboard/` dla panelu
  - `app/api/` dla auth, healthchecków i chronionego delivery draft assetów
  - `app/_actions/` dla `Server Actions`
  - `app/_lib/` dla logiki domenowej, auth, Prisma, storage i SEO
  - `app/_components/` dla współdzielonych komponentów i client islands

#### File conventions

- `app/layout.tsx`
  - root layout
  - używa `next/font`
  - ustawia globalne metadata templates i `viewport`
- `app/(site)/layout.tsx`
  - publiczny shell aplikacji
  - wspólna nawigacja i publiczny rytm layoutu
- `app/(dashboard)/dashboard/layout.tsx`
  - shell panelu
  - sidebar po lewej
  - auth gate i permission gate dla dashboardu
- `page.tsx`
  - każdy główny widok jako osobna strona
- `loading.tsx`
  - katalog serii
  - strona serii
  - reader shell
  - dashboard i jego cięższe listy
- `error.tsx`
  - przede wszystkim dla dashboardu
  - lokalna obsługa błędów panelu bez rozwalania całej aplikacji
- `global-error.tsx`
  - awaryjny fallback dla root layoutu
- `not-found.tsx`
  - 404 dla brakujących serii i rozdziałów
- `unauthorized.tsx`
  - brak sesji
- `forbidden.tsx`
  - brak wymaganych uprawnień
- `sitemap.ts`
  - generuje sitemapę dla publicznych widoków
- `robots.ts`
  - globalne robots rules
- `opengraph-image.tsx`
  - globalny fallback OG dla instancji

#### Trasy publiczne

- `app/(site)/page.tsx`
  - home
  - hero z nazwą grupy, opcjonalnym opisem i chmurą okładek
  - sekcja `Najnowsze aktualizacje`
- `app/(site)/series/page.tsx`
  - katalog serii jako grid okładek
- `app/(site)/series/[slug]/page.tsx`
  - pionowa strona serii
  - opis i chapter list
- `app/(site)/chapter/[chapterId]/[slug]/page.tsx`
  - reader
  - `chapterId` jest technicznym identyfikatorem
  - `slug` jest częścią czytelnego URL-a

#### Trasy dashboardu

- `app/(dashboard)/dashboard/page.tsx`
  - główny widok panelu
- `app/(dashboard)/dashboard/series/page.tsx`
  - lista serii
- `app/(dashboard)/dashboard/series/new/page.tsx`
  - tworzenie serii
- `app/(dashboard)/dashboard/series/[id]/page.tsx`
  - edycja serii
- `app/(dashboard)/dashboard/chapters/page.tsx`
  - lista rozdziałów
- `app/(dashboard)/dashboard/chapters/[id]/page.tsx`
  - edycja rozdziału, upload, preview i publikacja
- `app/(dashboard)/dashboard/settings/page.tsx`
  - `InstanceSettings`
- `app/(dashboard)/dashboard/users/page.tsx`
  - role i użytkownicy
- `app/(dashboard)/dashboard/trash/series/page.tsx`
  - kosz serii
- `app/(dashboard)/dashboard/trash/chapters/page.tsx`
  - kosz rozdziałów

#### Route Handlers

- `app/api/auth/[...nextauth]/route.ts`
  - `Auth.js`
- `app/api/health/route.ts`
  - healthcheck dla `docker compose`
- `app/api/draft-assets/[assetId]/route.ts`
  - chronione dostarczanie assetów draftów po autoryzacji
- `Route Handlers` nie są używane do zwykłych mutacji panelu
- `Route Handlers` pozostają cienkie i służą tylko tam, gdzie potrzebny jest endpoint

#### `Server Components`

- są domyślnym modelem dla odczytu danych
- używamy ich dla:
  - home
  - katalogu
  - strony serii
  - reader shell
  - dashboard shell
  - dashboard lists i podstawowych widoków formularzy
- powód:
  - lepsze SEO
  - prostszy dostęp do bazy
  - mniej client-server waterfall

#### `Client Components`

- są używane tylko tam, gdzie potrzebna jest interakcja
- używamy ich dla:
  - lekkiego parallaxu chmury okładek na home
  - wyszukiwarki i filtrów katalogu
  - przełącznika stylu czytania
  - nawigacji i zachowań readera zależnych od trybu
  - uploadu plików
  - listy miniatur i ewentualnego reorderu stron
  - `drawer` dla mniejszych akcji dashboardu
- nie robimy `async` client components
- do clientów przekazujemy tylko serializowalne dane

#### `Server Actions`

- są podstawowym mechanizmem mutacji wewnętrznych
- używamy ich dla:
  - tworzenia i edycji serii
  - tworzenia i edycji rozdziałów
  - zapisu `InstanceSettings`
  - przypisywania ról i presetów
  - publish i unpublish
  - soft delete i restore
  - zapisu preferencji czytania dla zalogowanych użytkowników
- `Server Actions` mają zawierać jawne permission checks

#### Auth i funkcje request context

- `cookies()` i `headers()` używamy tylko w scenariuszach auth i request context
- dashboard layout sprawdza sesję i uprawnienia po stronie serwera
- brak sesji prowadzi do `unauthorized()`
- brak wymaganych permissionów prowadzi do `forbidden()`
- `redirect()` służy do bezpiecznych przejść po udanych akcjach panelowych
- `notFound()` służy do brakujących serii i rozdziałów

#### Metadata i SEO

- `generateMetadata()` używamy dla:
  - home jako globalnego fallbacku SEO
  - strony serii
  - strony rozdziału
- strony serii i rozdziałów dynamicznie nadpisują globalne metadata
- `site title`, `site description` i `keywords` z `InstanceSettings` działają jako globalny fallback
- `APP_URL`, jeśli ustawione, jest źródłem canonicali i bazą dla callbacków auth oraz metadata

#### `next/image`

- używamy go dla:
  - okładek serii
  - miniatur
  - dashboard preview assets
  - statycznych assetów brandingowych, jeśli to ma sens
- nie używamy go jako jedynego modelu renderowania pełnych stron rozdziału
- reader ma preferować stabilne dostarczanie długich obrazów i prosty rendering

#### `next/font`

- root layout używa `next/font`
- fonty są mapowane przez zmienne CSS i konfigurację stylów
- nie używamy ręcznych `<link>` do Google Fonts

#### `next/dynamic`

- używamy oszczędnie dla cięższych client-only modułów
- główne przypadki:
  - uploader
  - reorder UI
  - bardziej interaktywne elementy dashboardu

#### `Suspense`

- stosujemy tam, gdzie client islands używają hooków takich jak `useSearchParams`
- katalog i dynamiczne fragmenty dashboardu mogą być punktowo otaczane przez `Suspense`
- nie robimy przez to pełnego CSR dla całych stron

#### Async request APIs

- `params`, `searchParams`, `cookies()` i `headers()` traktujemy zgodnie z nowym modelem async
- strony i `generateMetadata()` mają używać async propsów zgodnie z regułami Next.js 15+

#### Runtime i self-host

- domyślny runtime: `Node.js`
- nie używamy `Edge runtime`
- `next.config` ma używać `output: 'standalone'`
- obraz Dockera ma kopiować:
  - `.next/standalone`
  - `.next/static`
  - `public`
- `docker compose` pozostaje oficjalnym deploymentem lokalnym i self-hostowym

---

## Status wdrożenia ustaleń

Na stan repo po wdrożeniu fazy scaffoldingu poniższe obszary są już zrealizowane:

- schemat `Prisma` obejmuje `InstanceSettings`, `SocialLink`, `TaxonomyTerm`, `Series`, `Chapter`, `ChapterPage`, `Asset` i historie slugów
- routing `App Router` jest rozdzielony na `app/(site)/`, `app/(dashboard)/dashboard/` i cienkie `app/api/`
- `docker compose` obsługuje `app + postgres` oraz opcjonalny profil `minio`
- katalog envów i nazwy zmiennych środowiskowych są zapisane w `.env.example`

Otwarte pozostają tylko przyszłe doprecyzowania wynikające z kolejnych zmian produktu, a nie brak fundamentów implementacyjnych.

---

## Status

- To jest roboczy log ustaleń, nie drugi pełny spec architektury.
- Master spec pozostaje głównym dokumentem produktu i kierunku technicznego.
- Ten plik ma służyć jako wejście do kolejnego planu technicznego, który rozpisze implementację bardziej szczegółowo.
