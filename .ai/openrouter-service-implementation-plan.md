## 1. Opis usługi

Usługa **OpenRouterService** będzie odpowiedzialna za komunikację z API OpenRouter w celu wykonywania zapytań typu chat completions na potrzeby generowania fiszek w aplikacji AI Flashcard Generator. Jej głównym zadaniem będzie przyjęcie ustrukturyzowanego żądania z warstwy domenowej (np. `generateFlashcards` w `generation.service`), zbudowanie poprawnego payloadu dla OpenRouter, wywołanie API z odpowiednimi nagłówkami i konfiguracją, a następnie zwrócenie głównego obiektu `message` z odpowiedzi. Tworzenie promptów (`system`, `user`, meta‑prompt) oraz mapowanie odpowiedzi na docelowe struktury domenowe (np. fiszki) pozostaje odpowiedzialnością serwisów domenowych.

Usługa powinna być umieszczona w katalogu `src/lib/services` (np. plik `openrouter.service.ts`) i używana z poziomu serwisów domenowych (`src/lib/services/generation.service.ts`) oraz ewentualnie innych API routes (`src/pages/api/*`), ale nigdy bezpośrednio z frontendu (ze względu na bezpieczeństwo klucza API).

### 1.1. Kluczowe komponenty usługi

1. **Konfiguracja OpenRouter (OpenRouterConfig)**  
   Odpowiada za przechowywanie i walidację konfiguracji połączenia z API: klucz API, baza URL, domyślny model, limity czasowe, domyślne parametry modeli oraz flagi bezpieczeństwa (np. czy wymuszać `response_format`).

2. **Klient HTTP do OpenRouter (OpenRouterHttpClient)**  
   Hermetyzuje logikę wykonywania żądań HTTP (np. `fetch`) do OpenRouter: ustawianie nagłówków, serializacja JSON, obsługa timeoutu, podstawowa obsługa błędów transportowych, zwracanie ujednoliconego wyniku.

3. **Budowniczy payloadu i parametrów (OpenRouterRequestBuilder)**  
   Odpowiada za budowę payloadu żądania na podstawie przekazanych z zewnątrz wiadomości (`messages` zawierających role `system`, `user`, opcjonalnie `assistant`), konfiguracji `model`, `response_format` (zawsze w wariancie JSON Schema), `max_tokens`, `temperature` itd. Nie tworzy promptów – zakłada, że tablica `messages` oraz obiekt `response_format` zostały zbudowane w serwisach domenowych i są przekazywane jako parametry.

4. **Serwis wysokiego poziomu (OpenRouterService)**  
   Publiczna fasada łącząca powyższe komponenty. Zapewnia metody typu „use‑case” na poziomie komunikacji z OpenRouter (np. `createChatCompletionWithSchema`), które przyjmują gotowe `messages` oraz definicję `response_format`, wołają `RequestBuilder` i `HttpClient`, a następnie zwracają główny obiekt `message` z odpowiedzi (bez mapowania na format fiszek) lub rzucają kontrolowane błędy domenowe (np. mapowane na `GenerationErrorCodes`).

### 1.2. Wybrane wyzwania i kierunki rozwiązań (wysokopoziomowo)

1. **Spójna konfiguracja i zarządzanie sekretami**  
   1. Możliwe wyzwanie: brakujące lub błędne wartości w `import.meta.env`, różne konfiguracje między lokalnym środowiskiem, CI i produkcją.  
   2. Rozwiązanie: centralna walidacja konfiguracji w konstruktorze usługi, jednoznaczne nazwy zmiennych środowiskowych (np. `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_DEFAULT_MODEL`), fail-fast przy starcie (wyrzucenie czytelnego błędu, jeśli konfiguracja jest niekompletna).

2. **Bezpieczna i odporna na błędy komunikacja HTTP**  
   1. Możliwe wyzwanie: timeouty sieciowe, błędy DNS, problemy TLS, błędne formaty JSON w odpowiedzi.  
   2. Rozwiązanie: stosowanie kontrolera abort (`AbortController`) z konfigurowalnym timeoutem, defensywna deserializacja JSON (try/catch), jasna klasyfikacja błędów (transportowe vs. biznesowe) oraz powtarzalna struktura błędów domenowych.

3. **Projektowanie `response_format` dla JSON Schema**  
   1. Możliwe wyzwanie: model nie przestrzega ściśle schematu, zwraca niepoprawny JSON lub miesza treść naturalną z JSON.  
   2. Rozwiązanie: stosowanie `strict: true`, jasne i proste schematy JSON, walidacja odpowiedzi po stronie serwera (np. Zod / własne walidatory) oraz mechanizm retry z uproszczonym promptem w razie błędu.

4. **Mapowanie błędów OpenRouter na błędy domenowe**  
   1. Możliwe wyzwanie: różne struktury błędów (HTTP 4xx/5xx, błędy limitów, błędy modeli), które muszą być zmapowane na wąski zbiór kodów (`GenerationErrorCodes`).  
   2. Rozwiązanie: dedykowana warstwa tłumacząca (np. prywatna metoda) analizująca status HTTP, kod błędu i treść komunikatu i zwracająca predefiniowane kody domenowe (`AI_TIMEOUT`, `AI_RESPONSE_INVALID`, `AI_GENERATION_ERROR`).

5. **Zachowanie separacji frontendu i backendu**  
   1. Możliwe wyzwanie: przypadkowe wycieknięcie klucza API do klienta (np. przez endpoint proxy, który zwraca zbyt dużo danych diagnostycznych).  
   2. Rozwiązanie: twarda zasada, że OpenRouterService jest używany tylko w warstwie backendowej (Astro API routes, serwisy w `src/lib`), brak przekazywania klucza w odpowiedziach, cenzurowanie logów.

6. **Integracja z istniejącym serwisem `generation.service`**  
   1. Możliwe wyzwanie: zachowanie obecnych kontraktów (`generateFlashcards` zwraca `FlashcardProposalDto[]`, użycie `GenerationErrorCodes`) przy jednoczesnej podmianie mocka na realne API.  
   2. Rozwiązanie: wprowadzenie `OpenRouterService` jako zależności `generation.service`, a następnie stopniowe zastąpienie mocka logiką z OpenRouter bez zmiany publicznego API `generation.service`.

---

## 2. Opis konstruktora

Konstruktor usługi **OpenRouterService** powinien przyjmować obiekt konfiguracji `OpenRouterConfig`, który jest budowany w jednym miejscu (np. w `src/lib/services/openrouter.config.ts`). Konfiguracja powinna być wyprowadzona z `import.meta.env` oraz z ewentualnych stałych domenowych (np. domyślny model do generowania fiszek).

### 2.1. Zakres odpowiedzialności konstruktora

1. Wczytanie wartości z konfiguracji środowiska:
   1. `OPENROUTER_API_KEY` – wymagany, sekret.  
   2. `OPENROUTER_BASE_URL` – opcjonalny, z domyślną wartością np. `https://openrouter.ai/api/v1`.  
   3. `OPENROUTER_DEFAULT_MODEL` – np. `gpt-4o-mini` - pobierany z env.  
   4. Limity i parametry: `OPENROUTER_TIMEOUT_MS`, `OPENROUTER_MAX_TOKENS`, `OPENROUTER_TEMPERATURE`.

2. Walidacja konfiguracji:
   1. Sprawdzenie obecności klucza API; w razie braku – rzucenie czytelnego błędu inicjalizacji (np. `OpenRouterConfigError`).  
   2. Sprawdzenie czy wartości numeryczne (timeout, max_tokens, temperatura) mieszczą się w akceptowalnych zakresach.  
   3. Opcjonalne sprawdzenie, czy domyślny model znajduje się na liście dozwolonych modeli.

3. Zbudowanie zależności wewnętrznych:
   1. Utworzenie instancji `OpenRouterHttpClient` z przekazaniem skonfigurowanego URL, klucza API i timeoutu.  
   2. Przygotowanie domyślnych parametrów modeli (np. `temperature`, `max_tokens`, `top_p`, `frequency_penalty`) przechowywanych później w polach prywatnych.  
   3. Brak przechowywania domyślnych metapromptów – wszystkie prompty (`system`, `user`) są budowane w serwisach domenowych i przekazywane do usługi jako tablica `messages`.

4. Przygotowanie hooków diagnostycznych:
   1. Opcjonalne przyjęcie logera (np. interfejs `Logger`), aby nie wiązać usługi z `console`.  
   2. Flagi sterujące logowaniem (np. czy logować tylko metadane, czy także skróconą wersję promptów).

### 2.2. Wymagania względem inicjalizacji w stacku Astro

1. Inicjalizacja powinna następować po stronie serwera (np. w kontekście `src/pages/api/*` lub w funkcjach serwisowych) – nigdy w kodzie wykonywanym w przeglądarce.  
2. Wydajne podejście to utworzenie pojedynczej instancji `OpenRouterService` na proces (np. moduł z wyeksportowaną singletonową instancją), aby unikać wielokrotnej walidacji konfiguracji i alokacji tych samych zależności.  
3. Inicjalizacja powinna być odporna na brakujące env-y: jeśli konfiguracja jest niekompletna, błąd powinien być złapany na etapie CI/deploy (np. test integracyjny sprawdzający, że można utworzyć `OpenRouterService`).

---

## 3. Publiczne metody i pola

Publiczny interfejs **OpenRouterService** powinien być wąski i oparty o use-case’y domenowe, dzięki czemu kod wyżej (np. `generation.service`) nie musi znać szczegółów OpenRouter. W kontekście generowania fiszek sensowne jest zaprojektowanie metody głównej oraz kilku metod pomocniczych, które mogą być użyte w przyszłych funkcjach.

### 3.1. Proponowane metody publiczne

1. **`createChatCompletionWithSchema(messages, responseFormat, options?)`**  
   1. Cel: wykonać wywołanie chat completions z użyciem JSON Schema jako `response_format` i zwrócić główny obiekt `message` z odpowiedzi.  
   2. Wejście:  
      1. `messages` – tablica wiadomości `{ role, content }` (w tym `system`, `user` itd.) przygotowana w serwisie domenowym, zawierająca już pełen prompt.  
      2. `responseFormat` – obiekt w formacie wymaganym przez OpenRouter: `{ type: 'json_schema', json_schema: { name, strict: true, schema } }`, zbudowany poza `OpenRouterService`.  
      3. `options` – opcjonalny obiekt (np. wybór modelu, parametry modelu typu `temperature`, `max_tokens`, `top_p`).  
   3. Działanie (wysokopoziomowo):  
      1. Zbudowanie payloadu z przekazanych `messages`, `responseFormat` i `options`.  
      2. Wywołanie OpenRouter przez `OpenRouterHttpClient`.  
      3. Sprawdzenie struktury odpowiedzi (np. istnienie `choices[0].message`).  
      4. Zwrócenie `choices[0].message` bez parsowania JSON ani mapowania na format fiszek; parsowanie i walidacja odbywa się w serwisie domenowym.

2. **`chatRaw(request)`**  
   1. Cel: ogólna metoda dla innych funkcjonalności czatu (np. bez JSON Schema lub z innymi parametrami), aby nie duplikować logiki HTTP i obsługi błędów.  
   2. Wejście: kompletny obiekt żądania chat completion (zawierający `messages`, model, parametry, ewentualny `response_format`).  
   3. Zwraca: generyczną strukturę odpowiedzi chat completion (np. oryginalne `choices`, `usage`, `id`), aby można było nad nią budować dodatkowe adaptery domenowe.

3. **`getDefaultModel()` / `getAllowedModels()`**  
   1. Cel: udostępnienie informacji o aktualnie skonfigurowanym modelu oraz ewentualnej liście modeli dozwolonych (np. do logiki wyboru modelu po stronie backendu lub do endpointu informacyjnego).  
   2. Wejście: brak lub parametry filtrowania.  
   3. Zwraca: identyfikator modelu (string) lub listę stringów.

4. **Publiczne pola konfiguracyjne tylko do odczytu**  
   1. Dostępne pola: np. `defaultModel`, `timeoutMs`, `maxTokens`, opcjonalnie `defaultSystemPromptId` (jeśli stosujemy registry promptów).  
   2. Są tylko do odczytu, aby z poziomu serwisów domenowych można było np. logować informacje o konfiguracji użytej do danego wywołania.

### 3.2. Konfiguracja elementów OpenRouter (system, user, response_format, model, parametry)

Poniżej koncentrujemy się na sposobie włączenia pięciu kluczowych elementów do zapytań oraz przykładach ich użycia. Elementy te są przygotowywane w serwisach domenowych (np. w `generation.service.ts`) i przekazywane do `OpenRouterService` jako argumenty (`messages`, `responseFormat`, `model`, parametry). Przykłady są abstrakcyjne, ale powinny być bezpośrednio przenaszalne do implementacji w TypeScripcie.

1. **Komunikat systemowy (`system` message)**  
   1. Rola: definiuje ogólne zachowanie modelu, styl odpowiedzi i ograniczenia (np. generowanie fiszek w ściśle określonym formacie).  
   2. Możliwe podejście: przechowywanie szablonów systemowych w kodzie (np. stałe w `openrouter.prompts.ts`) lub w konfiguracji, z możliwością parametryzacji (język, poziom trudności).  
   3. Przykład treści systemowej (skrótowo, bez kodu TypeScript):  
      1. Rola: `"system"`.  
      2. Treść: opis roli: nauczyciel, który generuje fiszki w formacie określonym przez JSON Schema, zakazany jest tekst poza JSON, odpowiedzi mają być zwięzłe.

2. **Komunikat użytkownika (`user` message)**  
   1. Rola: przekazuje właściwe dane wejściowe (np. tekst z którego generujemy fiszki) oraz parametry użycia (liczba fiszek, preferencje).  
   2. Możliwe podejście: konstrukcja treści użytkownika jako tekstu zawierającego instrukcję + surowy tekst do przetworzenia, wyraźne zaznaczenie sekcji z danymi (`INPUT_TEXT_START` / `INPUT_TEXT_END`) dla lepszej odporności na halucynacje.  
   3. Przykład treści użytkownika (logicznie):  
      1. „Wygeneruj maksymalnie 20 fiszek typu front/back na podstawie poniższego tekstu. Zwróć wyłącznie JSON zgodny z dostarczonym schematem. Tekst: ...”.

3. **Ustrukturyzowane odpowiedzi przez `response_format` (JSON Schema)**  
   1. Rola: wymusza, aby model zwrócił dane zgodne z określonym schematem JSON, co umożliwia bezpieczne parsowanie po stronie serwisu domenowego.  
   2. Możliwe podejście:  
      1. Definicja schematu JSON dla `FlashcardProposalDto[]` (tablica obiektów `{ front: string, back: string }`) lub innego DTO, zależnie od serwisu domenowego.  
      2. Zbudowanie obiektu `response_format` w serwisie domenowym i przekazanie go jako argument do `OpenRouterService`.  
      3. Walidacja odpowiedzi po stronie serwisu domenowego z użyciem analogicznego schematu (np. Zod) i mapowanie błędów walidacji na `AI_RESPONSE_INVALID`.  
   3. Minimalny przykładowy fragment `response_format` (upraszczający strukturę, bez pełnego schematu):  
      ```json
      {
        "type": "json_schema",
        "json_schema": {
          "name": "flashcard_proposals",
          "strict": true,
          "schema": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "front": { "type": "string" },
                "back": { "type": "string" }
              },
              "required": ["front", "back"]
            }
          }
        }
      }
      ```

4. **Nazwa modelu (`model`)**  
   1. Rola: wybór konkretnego modelu LLM (np. `gpt-4o-mini`, `gpt-4.1-mini`, model Anthropic itd.), który ma być użyty przez OpenRouter.  
   2. Możliwe podejście:  
      1. Domyślny model pobierany z konfiguracji (`OPENROUTER_DEFAULT_MODEL`) i używany przez `generateFlashcardProposalsFromText`.  
      2. Możliwość nadpisania modelu w `options`, ale tylko na liście dozwolonych modeli.  
   3. Przykład (logiczny):  
      1. Jeśli opcje nie zawierają modelu, użyj `defaultModel`.  
      2. Jeśli model wybrany przez użytkownika nie jest na liście dozwolonych, rzuć błąd domenowy (np. `AI_GENERATION_ERROR` z komunikatem o nieobsługiwanym modelu).

5. **Parametry modelu (`temperature`, `max_tokens`, itp.)**  
   1. Rola: kontrola stylu odpowiedzi (kreatywność vs. deterministyczność), długości odpowiedzi oraz kosztów tokenów.  
   2. Możliwe podejście:  
      1. Ustalenie bezpiecznych wartości domyślnych w konfiguracji OpenRouterService (np. `temperature` w zakresie 0.1–0.4, `max_tokens` zależne od use‑case).  
      2. Możliwość przekazania `options` z parametrami z serwisu domenowego, ale ograniczanie do bezpiecznych zakresów (np. clampowanie wartości) w warstwie OpenRouterService.  
   3. Przykład (logiczny):  
      1. Jeśli `options.temperature` jest spoza zakresu [0, 1], OpenRouterService zastępuje ją wartością domyślną.  
      2. Jeśli `options.maxTokens` przekracza ustalony limit, OpenRouterService ustawia ją na maksymalny dopuszczalny limit dla danego use‑case.

---

## 4. Prywatne metody i pola

Wewnętrzna implementacja usługi powinna korzystać z prywatnych metod i pól, które ukrywają szczegóły komunikacji z OpenRouter i przetwarzania odpowiedzi. Dzięki temu publiczny interfejs pozostaje prosty, a zmiana dostawcy LLM w przyszłości będzie możliwa przy minimalnej liczbie zmian w kodzie domenowym.

### 4.1. Przykładowe prywatne pola

1. `apiKey` – przechowuje klucz API; nigdy nie powinien być logowany ani ujawniany.  
2. `baseUrl` – bazowy URL API OpenRouter.  
3. `defaultModel` – identyfikator domyślnego modelu.  
4. `timeoutMs` – domyślny timeout dla żądań.  
5. `defaultModelParams` – obiekt z domyślnymi parametrami (`temperature`, `max_tokens`, `top_p`, itp.).  
6. `allowedModels` – lista modeli dopuszczonych do użycia.  
7. `logger` – opcjonalna abstrakcja logowania.  
8. `httpClient` – instancja `OpenRouterHttpClient`.

### 4.2. Przykładowe prywatne metody

1. **`buildChatCompletionPayload(messages, responseFormat, options)`**  
   1. Buduje pełny payload dla OpenRouter na potrzeby wywołania chat completions: przyjmuje tablicę `messages` przygotowaną w serwisie domenowym, obiekt `responseFormat` w wariancie JSON Schema oraz opcjonalne parametry modelu.  
   2. Dokonuje scalania wartości domyślnych (np. `model`, `temperature`, `max_tokens`) z przekazanymi w `options`.  
   3. Może wykonywać podstawowe sanity‑checki (np. czy tablica `messages` nie jest pusta, czy `responseFormat` ma wymagane pola).

2. **`sendRequestToOpenRouter(payload, abortSignal?)`**  
   1. Używa `OpenRouterHttpClient` do wykonania żądania POST na endpoint chat completions.  
   2. Centralizuje obsługę nagłówków (`Authorization`, `HTTP-Referer`, `X-Title` zgodnie z wymaganiami OpenRouter), serializacji JSON, kontroli timeoutu.  
   3. Zwraca surową odpowiedź już zdeserializowaną do obiektu (czyli po `JSON.parse`).

3. **`extractMessageFromResponse(rawResponse)`**  
   1. Przyjmuje surową odpowiedź z OpenRouter (np. strukturę zawierającą `choices`).  
   2. Sprawdza, czy istnieje co najmniej jeden element `choices` oraz czy zawiera on pole `message`.  
   3. Zwraca `choices[0].message` jako wynik metody publicznej; nie parsuje JSON z `message.content` ani nie mapuje danych na DTO domenowe.

4. **`mapErrorToGenerationErrorCode(error, context)`**  
   1. Analizuje błąd (HTTP status, kod błędu, typ błędu transportowego, informację o abort/timeout).  
   2. Zwraca jeden z kodów `GenerationErrorCodes` (np. `AI_TIMEOUT`, `AI_RESPONSE_INVALID`, `AI_GENERATION_ERROR`).  
   3. Pozwala na konsekwentne mapowanie błędów w całej aplikacji, ułatwiając obsługę po stronie API routes.

5. Helpery związane z długością wejścia i konstrukcją promptów  
   1. Heurystyki typu `sanitizeAndTruncateInput` oraz budowa metapromptów (`buildSystemPrompt`, `buildUserPromptForFlashcards`) powinny znajdować się w serwisach domenowych (np. w `generation.service.ts`), a nie w `OpenRouterService`.  
   2. OpenRouterService może ewentualnie weryfikować, że pojedyncze wiadomości nie przekraczają arbitralnie dużych limitów technicznych, ale nie powinien sam decydować o tym, które fragmenty treści są ważniejsze.

---

## 5. Obsługa błędów

Obsługa błędów powinna być spójna z istniejącym podejściem w `generation.service` i API routes (np. `GenerationErrorCodes`, mapowanie na HTTP 4xx/5xx). Poniżej wyszczególniono główne scenariusze błędów, wraz z zaleceniami ich obsługi.

### 5.1. Scenariusze błędów (numerowane)

1. **Brak lub niepoprawna konfiguracja OpenRouter**  
   1. Przykłady: brak `OPENROUTER_API_KEY`, niepoprawny URL, ujemny timeout.  
   2. Obsługa:  
      1. Fail-fast podczas inicjalizacji usługi (`OpenRouterConfigError`).  
      2. W środowisku produkcyjnym błąd powinien być wykryty na etapie deployu przez testy startowe.

2. **Błąd transportowy (sieć, DNS, TLS)**  
   1. Przykłady: brak połączenia z internetem, błąd certyfikatu TLS, przerwane połączenie.  
   2. Obsługa:  
      1. Złapanie błędu w warstwie `OpenRouterHttpClient`.  
      2. Zmapowanie na błąd domenowy `AI_GENERATION_ERROR` z informacją przyczynową (bez danych wrażliwych).  
      3. Logowanie szczegółów po stronie serwera (ale bez treści promptów).

3. **Timeout po stronie klienta (AbortController)**  
   1. Przykłady: OpenRouter nie odpowiada w zadanym czasie (`AI_TIMEOUT_MS`).  
   2. Obsługa:  
      1. Użycie `AbortController` i rzutowanie błędu z czytelną wiadomością (np. `"AI_TIMEOUT"`).  
      2. Mapowanie na `GenerationErrorCodes.AI_TIMEOUT`, które jest już obsługiwane w `generations` API route.  

4. **Odpowiedź HTTP z błędem (4xx/5xx)**  
   1. Przykłady: 401 (błędny lub wygasły klucz), 429 (rate limit), 500/503 (błąd po stronie OpenRouter lub modelu).  
   2. Obsługa:  
      1. Parsowanie treści błędu jeśli jest w JSON, z zachowaniem ostrożności (try/catch).  
      2. Dla 401 – log ostrzegawczy i błąd domenowy `AI_GENERATION_ERROR` z komunikatem o konfiguracji.  
      3. Dla 429 – opcjonalne mapowanie na odrębny kod (w przyszłości), obecnie można zaliczyć do `AI_GENERATION_ERROR` z przyjaznym komunikatem.  
      4. Dla 5xx – mapowanie na `AI_GENERATION_ERROR` z generycznym komunikatem „AI generation failed. Please try again later.”.

5. **Niepoprawny JSON w odpowiedzi**  
   1. Przykłady: model wygenerował tekst, który nie jest poprawnym JSON lub zawiera dodatkowy tekst poza JSON.  
   2. Obsługa:  
      1. Użycie `response_format` ze `strict: true` jako pierwsza linia obrony.  
      2. W razie błędu podczas `JSON.parse`, rzutowanie kontrolowanego błędu domenowego i mapowanie na `AI_RESPONSE_INVALID`.  
      3. Opcjonalnie mechanizm pojedynczego retry z uproszczonym promptem.

6. **JSON niezgodny ze schematem domenowym**  
   1. Przykłady: brak wymaganego pola `front` lub `back`, pola są zbyt długie, `flashcards` nie jest tablicą.  
   2. Obsługa:  
      1. Walidacja wyniku po stronie serwisu domenowego (np. Zod z tymi samymi ograniczeniami, co `validateFlashcardProposals`), przy wykorzystaniu JSON Schema użytego w `response_format`.  
      2. Mapowanie błędu walidacji na `AI_RESPONSE_INVALID` w warstwie domenowej, przy zachowaniu spójności z błędami zwracanymi przez `OpenRouterService`.  
      3. Logowanie przyczyn walidacji (bez pełnych danych).

7. **Przekroczenie limitów (np. zbyt długa prośba użytkownika)**  
   1. Przykłady: inputText jest ekstremalnie długi i grozi przekroczeniem limitu tokenów.  
   2. Obsługa:  
      1. Serwisy domenowe (np. `generation.service.ts`) przycinają i sanitizują tekst wejściowy przed zbudowaniem promptu (np. własne funkcje typu `sanitizeAndTruncateInput`).  
      2. W razie zbyt długiego wejścia zwracany jest błąd domenowy do użytkownika z prośbą o skrócenie tekstu i mapowaniem na `AI_GENERATION_ERROR` z czytelnym komunikatem.

8. **Błędy wewnętrzne (bugi w kodzie, nieprzewidziane wyjątki)**  
   1. Przykłady: wyjątki z rzutowań typów, błędy w adapterach.  
   2. Obsługa:  
      1. Wewnątrz `OpenRouterService` łapać niespodziewane błędy na granicy publicznych metod i opakowywać je w generyczny błąd domenowy.  
      2. W warstwie API (np. `generations` route) utrzymywać istniejący catch-all, który loguje błąd i zwraca `INTERNAL_ERROR` lub odpowiedni kod.

---

## 6. Kwestie bezpieczeństwa

Bezpieczeństwo jest kluczowe, ponieważ usługa operuje na treściach użytkowników i korzysta z tajnego klucza API OpenRouter. Należy wziąć pod uwagę zarówno bezpieczeństwo danych, jak i aspekt kosztów.

1. **Przechowywanie i użycie klucza API**  
   1. Klucz OpenRouter musi być przechowywany wyłącznie w zmiennych środowiskowych (`OPENROUTER_API_KEY`), nigdy nie w kodzie źródłowym ani repozytorium.  
   2. Usługa powinna odcinać możliwość wycieku klucza – brak logowania nagłówków z `Authorization`, brak zwracania tego klucza w odpowiedzi do klienta.  
   3. W CI/CD należy skonfigurować sekrety dla środowisk (np. DigitalOcean, GitHub Actions).

2. **Ochrona danych użytkownika**  
   1. Treści wejściowe (inputText) mogą zawierać dane wrażliwe. Należy minimalizować ich logowanie (np. maskowanie, skracanie, anonimowe identyfikatory).  
   2. Jeśli do logów trafiają prompt i odpowiedź, powinny być przechowywane w ograniczonym czasie i dostępne tylko dla uprawnionych osób.  
   3. W razie potrzeby, do OpenRouter można przekazywać informację w `X-Title` / `HTTP-Referer` zgodnie z ich wytycznymi, ale nie należy tam umieszczać danych wrażliwych.

3. **Ataki typu prompt injection / jailbreak**  
   1. System message powinien być zaprojektowany tak, aby minimalizować ryzyko przejęcia roli modelu przez użytkownika (jasne zasady, zakaz wykonywania poleceń spoza kontekstu generowania fiszek).  
   2. Tekst użytkownika powinien być odseparowany od instrukcji (np. sekcje `### INSTRUKCJA` i `### TEKST ŹRÓDŁOWY`), tak by model wyraźnie rozpoznawał, które fragmenty są danymi, a które instrukcją.  
   3. W razie wątpliwości, można stosować dodatkowe walidacje wyniku (czy odpowiedzi nie zawierają np. kodu lub treści wskazujących na jailbreak).

4. **Kontrola kosztów i rate limiting**  
   1. Integracja z istniejącym mechanizmem limitów dziennych (`ensureDailyLimit`) zapewnia ograniczenie liczby wywołań na użytkownika.  
   2. Dodatkowo można zaimplementować ograniczenia po stronie OpenRouter (limity finansowe na klucze API).  
   3. Dobrą praktyką jest logowanie metadanych użycia (np. `usage.total_tokens`) bez treści, aby monitorować koszty.

5. **Bezpieczeństwo endpointów API Astro**  
   1. OpenRouterService powinna być wywoływana tylko z zaufanych endpointów (np. `/api/generations`) zabezpieczonych autentykacją (w przyszłości – Supabase Auth zamiast `DEFAULT_USER_ID`).  
   2. Należy zwracać do klienta tylko to, co jest potrzebne (np. fiszki, ID sesji, uproszczone komunikaty błędów), bez szczegółów infrastrukturalnych czy danych z konfiguracji.

---

## 7. Plan wdrożenia krok po kroku

Poniższy plan jest dostosowany do stacku Astro + TypeScript + Supabase i zakłada, że docelowo zastąpisz obecne mockowe generowanie fiszek (`generateMockFlashcards`) realnym połączeniem z OpenRouter.

1. **Zaprojektowanie i implementacja `OpenRouterConfig`**  
   1. Utwórz moduł konfiguracji (np. `src/lib/services/openrouter.config.ts`), który:  
      1. Odczytuje potrzebne zmienne z `import.meta.env`.  
      2. Waliduje ich obecność i poprawność (typy, zakresy).  
      3. Eksportuje gotowy obiekt konfiguracji lub funkcję budującą konfigurację.  
   2. Zapewnij czytelne komunikaty błędów w razie niekompletnej konfiguracji.

2. **Stworzenie `OpenRouterHttpClient`**  
   1. Utwórz moduł (np. `src/lib/services/openrouter.http-client.ts`) odpowiedzialny za wykonywanie żądań HTTP do OpenRouter:  
      1. Funkcje do wykonywania żądań POST z JSON.  
      2. Obsługa `AbortController` i timeoutu.  
      3. Mapowanie błędów transportowych na kontrolowane wyjątki.  
   2. Zadbaj o ustawienie wymaganych nagłówków (`Authorization`, ewentualnie `HTTP-Referer`, `X-Title`).

3. **Zaprojektowanie i implementacja `OpenRouterService`**  
   1. Utwórz główny moduł usługi (np. `src/lib/services/openrouter.service.ts`), który:  
      1. Przyjmuje `OpenRouterConfig` i `OpenRouterHttpClient` w konstruktorze.  
      2. Inicjalizuje prywatne pola (`apiKey`, `baseUrl`, `defaultModel`, `defaultModelParams`, itd.).  
      3. Definiuje publiczne metody `createChatCompletionWithSchema` oraz ewentualnie bardziej ogólną `chatRaw`.  
   2. Zaimplementuj prywatne metody: `buildChatCompletionPayload`, `sendRequestToOpenRouter`, `extractMessageFromResponse`, `mapErrorToGenerationErrorCode`.

4. **Definicja `response_format` i schematu dla fiszek**  
   1. Zdefiniuj schemat JSON opisujący tablicę obiektów `{ front, back }` (tak jak w minimalnym przykładzie z sekcji 3.2) w warstwie domenowej (np. w `generation.service.ts` lub wspólnym module schematów).  
   2. Dodaj osobny moduł (np. `src/lib/services/openrouter.schemas.ts` lub moduł domenowy) zawierający schematy do ponownego użycia przy budowie `response_format` oraz walidacji odpowiedzi.  
   3. Buduj `response_format` w serwisie domenowym na podstawie tego schematu i przekazuj go jako argument do `OpenRouterService`; sama usługa jedynie przekazuje `response_format` dalej do OpenRouter.

5. **Integracja z istniejącym `generation.service`**  
   1. W module `src/lib/services/generation.service.ts`:  
      1. Dodaj zależność do `OpenRouterService` (np. przez import instancji lub funkcję fabrykującą).  
      2. W funkcji `generateFlashcards` zastąp logikę mockującą (`generateMockFlashcards`) sekwencją:  
         1. Zbuduj `system` i `user` message (oraz ewentualne inne role) zawierające metaprompt i tekst użytkownika.  
         2. Zbuduj `response_format` z JSON Schema opisującym tablicę fiszek `{ front, back }`.  
         3. Wywołaj `openRouterService.createChatCompletionWithSchema(messages, responseFormat, options)` i odbierz `message`.  
         4. Sparsuj `message.content` jako JSON, zmapuj na `FlashcardProposalDto[]` i zweryfikuj (np. istniejącym `validateFlashcardProposals`).  
   2. Upewnij się, że obsługa błędów w `generateFlashcards` mapuje błędy z `OpenRouterService` oraz błędy walidacji JSON na istniejące kody `GenerationErrorCodes` (`AI_TIMEOUT`, `AI_RESPONSE_INVALID`, `AI_GENERATION_ERROR`).

6. **Dostosowanie endpointu `/api/generations`**  
   1. Sprawdź, że endpoint `POST /api/generations` nadal przyjmuje taki sam payload (schema `createGenerationSchema`) i zwraca `GenerationResultDto`.  
   2. Upewnij się, że obsługa błędów (w szczególności sekcja `AI_TIMEOUT`, `AI_RESPONSE_INVALID`, `AI_GENERATION_ERROR`) jest spójna z błędami zwracanymi przez nową usługę.  
   3. Dodaj w razie potrzeby dodatkowe logowanie (bez danych wrażliwych) w przypadku błędów OpenRouter.


