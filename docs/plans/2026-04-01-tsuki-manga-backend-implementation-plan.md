# Tsuki Manga

## Plan implementacji backendu v1

Data: 2026-04-01  
Status: gotowy do wdrożenia  
Język dokumentu: polski

## Założenie

W tym projekcie `backend` oznacza serwerową warstwę aplikacji wewnątrz monolitu `Next.js`, a nie osobny serwis. Plan dotyczy:

- modelu danych,
- auth i permissions,
- storage,
- server-side mutacji,
- route handlers,
- envów i deploymentu backendowego,
- testów backendowych.

Frontend zostaje rozpisany osobno w następnym planie.

---

## 1. Cel backendu

Backend v1 ma zapewnić:

- bezpieczny model użytkowników, sesji i presetów ról,
- przechowywanie serii, rozdziałów, stron i ustawień instancji,
- workflow `draft -> publish`,
- obsługę `soft delete` i kosza,
- storage `local` i `S3-compatible`,
- chronione preview draftów,
- publiczne dostarczanie opublikowanych assetów,
- serwerowe API dla panelu w oparciu o `Server Actions`,
- cienkie endpointy dla auth, healthchecków i draft asset delivery.

---

## 2. Stos backendowy

- runtime: `Node.js`
- framework server-side: `Next.js App Router`
- ORM: `Prisma`
- baza danych: `PostgreSQL`
- auth: `Auth.js`
- package manager: `pnpm`
- testy:
  - `Vitest` dla unit/integration
  - `Playwright` dla E2E
- storage:
  - `local`
  - `S3-compatible`

---

## 3. Struktura backendu w repo

Docelowy podział odpowiedzialności:

```text
app/
  api/
    auth/[...nextauth]/route.ts
    health/route.ts
    draft-assets/[assetId]/route.ts

app/_actions/
  series/
  chapters/
  settings/
  users/
  trash/
  preferences/

app/_lib/
  auth/
  db/
  permissions/
  storage/
  seo/
  reader/
  validation/
  settings/

prisma/
  schema.prisma
  migrations/
```

Zasady:

- cała logika domenowa trafia do `app/_lib/`
- mutacje panelowe trafiają do `app/_actions/`
- `app/api/` zostaje cienkie i nie staje się głównym backendem REST
- `Prisma` i migracje są wyizolowane do `prisma/`

---

## 4. Modele danych

### 4.1 Identyfikatory

- wszystkie główne encje aplikacyjne używają `UUID`
- publiczny URL chaptera używa `chapterId + slug`
- slugi nie są reużywane

### 4.2 Auth i użytkownicy

Użyć standardowych modeli `Auth.js` kompatybilnych z `Prisma`:

- `User`
- `Account`
- `Session`
- `VerificationToken` jeśli będzie wymagany przez adapter

Rozszerzenia modelu `User`:

- `id: UUID`
- `displayName`
- `image`
- `rolePreset`
- `permissionBits`
- `createdAt`
- `updatedAt`
- `deletedAt` opcjonalnie niepotrzebne w v1 dla użytkowników, więc pominąć

### 4.3 Role i permissions

W bazie trzymać dwa pola:

- `rolePreset`
- `permissionBits`

`rolePreset`:

- `READER`
- `EDITOR`
- `PUBLISHER`
- `ADMIN`

`permissionBits` jako `Int` z sześcioma flagami:

- `USERS`
- `SETTINGS`
- `TAXONOMY`
- `SERIES`
- `CHAPTERS`
- `PUBLISH`

Mapowanie presetów:

- `READER = 0`
- `EDITOR = SERIES + CHAPTERS + SETTINGS`
- `PUBLISHER = SERIES + CHAPTERS + SETTINGS + PUBLISH`
- `ADMIN = USERS + SETTINGS + TAXONOMY + SERIES + CHAPTERS + PUBLISH`

Reguły:

- tylko `ADMIN` ma `USERS`
- `delete` i `restore` nie są osobnymi flagami; są prawem tylko dla `ADMIN`
- backend zawsze blokuje self-escalation

### 4.4 `InstanceSettings`

W v1 ma istnieć tylko jeden rekord ustawień instancji.

Pola:

- `id`
- `groupName`
- `groupDescription` nullable
- `siteTitle`
- `siteDescription`
- `keywords` jako relacja lub JSON listy stringów
- `logoAssetId` nullable
- `faviconAssetId` nullable
- `createdAt`
- `updatedAt`

Rekomendacja implementacyjna:

- `keywords` jako `String[]` jeśli wybrany provider Prisma/Postgres w projekcie pozwala wygodnie to utrzymać
- jeśli nie, użyć JSON array

### 4.5 `SocialLink`

Osobna tabela powiązana z `InstanceSettings`.

Pola:

- `id`
- `instanceSettingsId`
- `label`
- `url`
- `iconType` nullable
- `iconSvg` nullable
- `createdAt`
- `updatedAt`

Reguły:

- brak pola `order`
- jeśli `iconSvg` istnieje, ma pierwszeństwo nad `iconType`

### 4.6 Taksonomia

Jedna tabela np. `TaxonomyTerm`.

Pola:

- `id`
- `name`
- `slug`
- `type`:
  - `GENRE`
  - `TAG`
- `createdAt`
- `updatedAt`

Powiązanie z seriami jako relacja many-to-many.

Usuwanie:

- `hard delete`
- dozwolone także gdy termin jest używany
- backend przy usunięciu odpina powiązania z seriami

### 4.7 `Series`

Pola:

- `id`
- `title`
- `slug`
- `descriptionShort` nullable
- `descriptionLong` nullable
- `coverAssetId` nullable
- `visibility`
  - `PUBLIC`
  - `HIDDEN`
- `createdById`
- `updatedById`
- `deletedAt` nullable
- `createdAt`
- `updatedAt`

Relacje:

- do `TaxonomyTerm`
- do `Chapter`
- do `SeriesSlugHistory`

### 4.8 `SeriesSlugHistory`

Pola:

- `id`
- `seriesId`
- `slug`
- `createdAt`

Reguły:

- każdy poprzedni slug zapisujemy
- slugi z historii pozostają zarezerwowane

### 4.9 `Chapter`

Pola:

- `id`
- `seriesId`
- `slug`
- `number` jako decimal lub string-number pair
- `label` nullable
- `title` nullable
- `status`
  - `DRAFT`
  - `PUBLISHED`
- `publishedAt` nullable
- `createdById`
- `updatedById`
- `deletedAt` nullable
- `createdAt`
- `updatedAt`

Rekomendacja dla numeracji:

- `number` przechowywać jako `Decimal`
- `label` używać dla `extra`, `special` i podobnych wariantów

### 4.10 `ChapterSlugHistory`

Pola:

- `id`
- `chapterId`
- `slug`
- `createdAt`

### 4.11 `ChapterPage`

Pola:

- `id`
- `chapterId`
- `assetId`
- `pageOrder`
- `width`
- `height`
- `createdAt`

### 4.12 `Asset`

Jedna wspólna tabela metadanych assetów.

Pola:

- `id`
- `storageDriver`
- `kind`
  - `SERIES_COVER`
  - `CHAPTER_PAGE`
  - `INSTANCE_LOGO`
  - `INSTANCE_FAVICON`
- `scope`
  - `PUBLIC`
  - `DRAFT`
- `storageKey`
- `originalFilename`
- `mimeType`
- `sizeBytes`
- `width` nullable
- `height` nullable
- `createdById` nullable
- `createdAt`

Reguły:

- opublikowane chapter pages mają `scope = PUBLIC`
- draft chapter pages mają `scope = DRAFT`
- draft assets są serwowane przez aplikację po autoryzacji
- public assets są serwowane bezpośrednio ze storage

---

## 5. Auth i bootstrap

### 5.1 Providerzy

- v1 startuje z `Discord`
- architektura auth ma umożliwiać dodanie kolejnych providerów później

### 5.2 Bootstrap admina

- env zawiera pojedynczy `DISCORD_BOOTSTRAP_ADMIN_ID`
- przy pierwszym logowaniu użytkownika z tym `provider account id` backend nadaje preset `ADMIN`
- po tym dalsze role są już zarządzane z panelu

### 5.3 Testowy provider

- testowy provider jest domyślnie wyłączony
- aktywuje się tylko przez dedykowaną flagę env
- może działać w testach i lokalnym dev

---

## 6. Storage i asset delivery

### 6.1 Interfejs storage

W `app/_lib/storage/` zdefiniować wspólny interfejs:

- `put()`
- `delete()`
- `exists()`
- `getPublicUrl()`
- `getDraftStream()` lub równoważną metodę odczytu chronionego

Implementacje:

- `local`
- `s3`

### 6.2 Local storage

- domyślny driver po świeżym klonie
- stała ścieżka w kontenerze
- brak env do custom patha

### 6.3 S3-compatible

Wymagane env:

- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`

### 6.4 Upload flow

1. `editor` wrzuca wiele obrazów naraz.
2. Backend waliduje format i limity.
3. Backend zapisuje assety jako draft.
4. Backend odczytuje metadata obrazów.
5. Backend tworzy rekordy `Asset` i `ChapterPage`.
6. Kolejność stron wynika z uploadu lub nazw plików, a potem może być zmieniona ręcznie.

Walidacja:

- formaty: `PNG`, `JPG/JPEG`, `WebP`
- `40 MB` na plik
- `2 GB` na chapter

### 6.5 Draft vs public

- draft assets:
  - prywatne
  - serwowane przez `app/api/draft-assets/[assetId]/route.ts`
- public assets:
  - bezpośredni URL ze storage
  - używane w publicznym readerze

### 6.6 Publish

Przy publikacji rozdziału backend:

- sprawdza kompletność chaptera
- zmienia status na `PUBLISHED`
- ustawia `publishedAt`
- publikuje logicznie assety chaptera jako publiczne

Przy `unpublish`:

- chapter wraca do `DRAFT`
- assety znowu stają się draftowe logicznie lub przestają być referencjonowane jako publiczne, zależnie od implementacji drivera

Rekomendowana implementacja:

- nie przenosić fizycznie plików między bucketami/folderami, jeśli nie jest to konieczne
- zmieniać warstwę logicznej widoczności i sposób dostępu

---

## 7. `Server Actions`

Podzielić actions per domena:

- `series`
- `chapters`
- `settings`
- `users`
- `trash`
- `preferences`

Minimalne akcje:

### `series`

- create series
- update series
- soft delete series
- restore series

### `chapters`

- create chapter
- update chapter
- reorder pages
- upload chapter pages
- publish chapter
- unpublish chapter
- soft delete chapter
- restore chapter

### `settings`

- update instance settings
- upload/replace logo
- upload/replace favicon
- create/update/delete social link
- create/update/delete taxonomy term

### `users`

- list users
- assign preset
- update permission bits only if kiedyś będzie potrzebne, ale v1 UI operuje presetami

### `preferences`

- save reading mode preference for logged-in users

Każda action:

- wykonuje auth check
- wykonuje permission check
- waliduje input
- zwraca bezpieczny wynik dla UI

---

## 8. Route Handlers

### `Auth.js`

- `app/api/auth/[...nextauth]/route.ts`

### `Health`

- `app/api/health/route.ts`
- zwraca prosty status aplikacji
- opcjonalnie sprawdza połączenie z bazą

### `Draft assets`

- `app/api/draft-assets/[assetId]/route.ts`
- sprawdza sesję
- sprawdza permissions użytkownika
- potwierdza, że asset należy do draftowego zasobu
- streamuje plik przez aktywny storage driver

Nie budować osobnego REST API dla CRUD-ów serii i rozdziałów w v1.

---

## 9. Permission i business rules

### 9.1 Dostęp

- `READER` nie ma dostępu do `/dashboard`
- dashboard wymaga serwerowego gate w layout i w actions

### 9.2 Delete i restore

- tylko `ADMIN`
- `soft delete` serii kasuje logicznie również jej chaptery
- restore serii:
  - seria wraca jako `HIDDEN`
  - chaptery wracają jako `DRAFT`
- restore chaptera przy usuniętej serii:
  - backend zwraca stan wymagający potwierdzenia restore serii

### 9.3 Taxonomy

- tylko `ADMIN`
- hard delete z odpięciem powiązań

### 9.4 Users

- tylko `ADMIN`
- backend blokuje self-escalation

---

## 10. Env i konfiguracja

Minimalny katalog envów:

- `NODE_ENV`
- `APP_URL` nullable
- `APP_TIMEZONE` nullable, fallback `UTC`
- `AUTH_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOOTSTRAP_ADMIN_ID`
- `ENABLE_TEST_AUTH` lub równoważna flaga
- `DATABASE_URL`
- `STORAGE_DRIVER=local|s3`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`

Zasady:

- `APP_URL`, jeśli ustawione, wygrywa nad hostem z requestu
- jeśli brak `APP_URL`, canonicale i callbacki mogą spaść do request host fallback
- `.env.example` obejmuje wszystkie tryby, także test auth

---

## 11. Docker i self-host

Oficjalny układ:

- `app`
- `postgres`
- opcjonalny `minio`

Profile:

- domyślny: `local storage`
- profil `minio`: test i symulacja `S3-compatible`
- profil lub wariant testowy: `app + postgres`

Healthchecki:

- `app`
- `postgres`
- opcjonalnie `minio`

`Next.js` build:

- `output: 'standalone'`

---

## 12. Kolejność implementacji backendu

### Etap 1. Fundament

- skonfigurować `pnpm`
- dodać `Prisma`
- skonfigurować `PostgreSQL`
- przygotować `.env.example`
- dodać `Auth.js` z Discord provider

### Etap 2. Schemat danych

- zaimplementować modele auth
- zaimplementować modele instancji, taksonomii, serii, chapterów, assetów, slug history
- uruchomić pierwsze migracje

### Etap 3. Permissions i auth helpers

- zdefiniować permission bits
- zdefiniować mapowanie presetów
- dodać serwerowe helpery auth i permission checks
- dodać bootstrap admina po provider account id

### Etap 4. Storage

- zdefiniować storage interface
- wdrożyć `local`
- wdrożyć `s3`
- wdrożyć draft asset route

### Etap 5. Domena treści

- series actions
- chapter actions
- upload flow
- publish / unpublish
- slug history
- soft delete / restore

### Etap 6. Settings i taxonomy

- `InstanceSettings`
- `SocialLink`
- logo / favicon
- taxonomy CRUD

### Etap 7. Health i operacyjność

- `health` route
- compose profiles
- minio profile

### Etap 8. Testy backendowe

- unit tests dla helperów
- integration tests z prawdziwym `PostgreSQL`
- storage tests
- przygotowanie backendu pod E2E auth i flows

---

## 13. Plan testów backendu

### Unit

- mapowanie presetów na bity
- helpery auth i permissions
- slug generation i slug reuse blocking
- metadata pomocnicze dla readera i SEO, jeśli będą miały logikę domenową

### Integration

Uruchamiane z prawdziwą bazą `PostgreSQL`:

- auth i permissions
- CRUD serii i rozdziałów
- publish i unpublish
- soft delete i restore
- taxonomy delete behavior
- `InstanceSettings` update
- `local storage` adapter
- `s3 storage` adapter

### E2E backend dependencies

Backend musi umożliwić E2E dla:

- logowania przez test auth provider
- utworzenia serii
- utworzenia draft chaptera
- publikacji chaptera
- publicznej widoczności chaptera

Minimalne E2E działają tylko na `local storage`.

---

## 14. Assumptions

- Backend pozostaje częścią monolitu `Next.js`, bez osobnego serwisu API.
- Publiczne CRUD API nie jest częścią v1.
- `delete` i `restore` pozostają uprawnieniami tylko dla `ADMIN`.
- `InstanceSettings` nie trzyma operacyjnych rzeczy takich jak storage driver lub timezone.
- Branding colors pozostają poza bazą i panelem.
- Decision log Phase 2 jest nadrzędnym źródłem szczegółowych decyzji, jeśli master spec jest bardziej ogólny.
