# Dokument wymagań produktu (PRD) - AI Flashcard Generator

## 1. Przegląd produktu

AI Flashcard Generator to aplikacja internetowa zaprojektowana w celu usprawnienia procesu tworzenia fiszek edukacyjnych. Wykorzystując sztuczną inteligencję, aplikacja automatycznie generuje zestawy fiszek na podstawie tekstu dostarczonego przez użytkownika, znacznie skracając czas potrzebny na ich przygotowanie. Produkt skierowany jest do studentów i samouków, którzy chcą efektywnie wykorzystywać metodę nauki opartą na powtórkach (spaced repetition), ale są zniechęceni czasochłonnym procesem manualnego tworzenia materiałów.

## 2. Problem użytkownika

Głównym problemem, który rozwiązuje nasza aplikacja, jest wysoki próg wejścia w regularne stosowanie metody fiszek. Manualne tworzenie wysokiej jakości, zwięzłych fiszek z obszernych materiałów (np. notatek z wykładów, artykułów) jest procesem powolnym i żmudnym. Ten wysiłek często przewyższa postrzegane korzyści, co prowadzi do porzucenia jednej z najskuteczniejszych technik nauki.

## 3. Wymagania funkcjonalne

### 3.1. System kont użytkowników
- Użytkownicy mogą zakładać konto za pomocą adresu e-mail i hasła.
- Użytkownicy mogą logować się i wylogowywać ze swojego konta.
- System zapewnia bezpieczne przechowywanie danych uwierzytelniających.

### 3.2. Zarządzanie kategoriami (Deckami)
- Użytkownicy mogą tworzyć nowe decki (kategorie) dla swoich fiszek.
- Użytkownicy mogą edytować nazwy istniejących decków.
- Użytkownicy mogą usuwać decki wraz z całą ich zawartością.

### 3.3. Generowanie fiszek przez AI
- Użytkownik może wkleić tekst o długości od 1000 do 10000 znaków w dedykowane pole.
- System generuje zestaw fiszek w formacie przód/tył (pytanie/odpowiedź, termin/definicja itp.). Długość pojedynczej fiszki nie przekracza 200 znaków.
- Po wygenerowaniu użytkownik przegląda fiszki, akceptując lub odrzucając każdą z nich. Odrzucone fiszki są trwale usuwane.
- Wszystkie zaakceptowane fiszki są masowo przypisywane do jednego, wybranego przez użytkownika decku.
- Obowiązuje limit 10 operacji generowania fiszek przez AI na użytkownika dziennie.

### 3.4. Manualne zarządzanie fiszkami
- Użytkownicy mogą ręcznie tworzyć nowe fiszki (przód/tył) w wybranym decku.
- Użytkownicy mogą edytować treść istniejących fiszek.
- Użytkownicy mogą usuwać pojedyncze fiszki.

### 3.5. System nauki
- Użytkownik może rozpocząć sesję nauki dla dowolnego decku.
- Interfejs nauki prezentuje najpierw przód fiszki, a po interakcji użytkownika (np. kliknięciu) odkrywa tył.
- Użytkownik dokonuje samooceny, zaznaczając, czy znał odpowiedź ("wiedziałem" / "nie wiedziałem").
- Odpowiedź użytkownika wpływa na harmonogram przyszłych powtórek danej fiszki, zgodnie z prostym algorytmem spaced repetition.
- Użytkownik ma możliwość zresetowania postępu nauki dla całego decku.

### 3.6. Interfejs i statystyki
- Użytkownik widzi listę swoich decków.
- Dla każdego decku widoczna jest całkowita liczba fiszek.
- W panelu głównym wyświetlana jest łączna liczba fiszek powtórzonych w danym dniu.

## 4. Granice produktu

### 4.1. Funkcjonalności w zakresie MVP
- Rejestracja i logowanie użytkowników (e-mail/hasło).
- Generowanie fiszek przez AI z wklejonego tekstu.
- Pełne zarządzanie (CRUD) deckami i fiszkami.
- Prosty system nauki z samooceną "wiedziałem"/"nie wiedziałem".
- Integracja z gotowym, prostym algorytmem powtórek.
- Podstawowe statystyki użytkowania.

### 4.2. Funkcjonalności poza zakresem MVP
- Zaawansowane algorytmy powtórek (np. SuperMemo, Anki).
- Import plików (PDF, DOCX itp.).
- Współdzielenie i publiczne udostępnianie decków.
- Integracje z zewnętrznymi platformami edukacyjnymi.
- Dedykowane aplikacje mobilne (projekt jest wyłącznie aplikacją webową).
- System monetyzacji i plany subskrypcyjne.

## 5. Historyjki użytkowników

### Zarządzanie kontem
---
- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu mojego adresu e-mail i hasła, aby móc zapisywać swoje fiszki.
- Kryteria akceptacji:
  - Formularz rejestracji zawiera pola na e-mail i hasło (z potwierdzeniem).
  - Walidacja sprawdza, czy e-mail jest w poprawnym formacie.
  - Walidacja sprawdza, czy hasła w obu polach są identyczne.
  - System sprawdza, czy adres e-mail nie jest już zarejestrowany.
  - Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do panelu głównego.

---
- ID: US-002
- Tytuł: Logowanie do systemu
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich decków i fiszek.
- Kryteria akceptacji:
  - Formularz logowania zawiera pola na e-mail i hasło.
  - Po podaniu poprawnych danych jestem przekierowany do panelu głównego.
  - W przypadku podania błędnych danych wyświetlany jest stosowny komunikat.

---
- ID: US-003
- Tytuł: Wylogowanie z systemu
- Opis: Jako zalogowany użytkownik, chcę móc się wylogować, aby zabezpieczyć dostęp do mojego konta.
- Kryteria akceptacji:
  - W interfejsie znajduje się przycisk "Wyloguj".
  - Po kliknięciu przycisku moja sesja zostaje zakończona i jestem przekierowany na stronę logowania.

### Zarządzanie deckami
---
- ID: US-004
- Tytuł: Tworzenie nowego decku
- Opis: Jako użytkownik, chcę móc stworzyć nowy deck (kategorię), aby organizować moje fiszki tematycznie.
- Kryteria akceptacji:
  - W interfejsie jest opcja (np. przycisk) "Stwórz nowy deck".
  - Po jej wybraniu mogę wpisać nazwę dla nowego decku.
  - Nowo utworzony deck pojawia się na liście moich decków.

---
- ID: US-005
- Tytuł: Zmiana nazwy decku
- Opis: Jako użytkownik, chcę mieć możliwość zmiany nazwy istniejącego decku, jeśli popełniłem błąd lub zmieniłem koncepcję.
- Kryteria akceptacji:
  - Przy każdym decku na liście znajduje się opcja edycji nazwy.
  - Po zapisaniu zmiany nowa nazwa jest widoczna na liście.

---
- ID: US-006
- Tytuł: Usuwanie decku
- Opis: Jako użytkownik, chcę móc usunąć cały deck, gdy nie jest mi już potrzebny.
- Kryteria akceptacji:
  - Przy każdym decku na liście znajduje się opcja usunięcia.
  - Przed ostatecznym usunięciem system prosi o potwierdzenie operacji.
  - Usunięcie decku powoduje nieodwracalne usunięcie wszystkich zawartych w nim fiszek.

### Generowanie i zarządzanie fiszkami
---
- ID: US-007
- Tytuł: Generowanie fiszek przez AI
- Opis: Jako student, chcę wkleić notatki z wykładu, aby system automatycznie stworzył dla mnie zestaw fiszek, oszczędzając mój czas.
- Kryteria akceptacji:
  - Na stronie głównej znajduje się duże pole tekstowe do wklejania treści.
  - Po wklejeniu tekstu (1000-10000 znaków) i kliknięciu przycisku "Generuj", system rozpoczyna proces.
  - Po zakończeniu generowania przechodzę do ekranu przeglądu, gdzie mogę zaakceptować lub odrzucić każdą fiszkę.
  - Po dokonaniu selekcji mogę wybrać z listy rozwijanej jeden z moich decków i przypisać do niego wszystkie zaakceptowane fiszki.

---
- ID: US-008
- Tytuł: Obsługa limitu generacji AI
- Opis: Jako użytkownik, chcę być poinformowany, gdy osiągnę dzienny limit generowania fiszek.
- Kryteria akceptacji:
  - Po wykonaniu 10 generacji w ciągu dnia, próba kolejnej skutkuje wyświetleniem komunikatu o osiągnięciu limitu.
  - Przycisk "Generuj" staje się nieaktywny do następnego dnia.

---
- ID: US-009
- Tytuł: Ręczne tworzenie fiszki
- Opis: Jako osoba ucząca się języka, chcę móc szybko dodać pojedynczą fiszkę z nowym słówkiem bezpośrednio do wybranego decku.
- Kryteria akceptacji:
  - W widoku decku znajduje się opcja "Dodaj fiszkę".
  - Formularz zawiera pola na przód (awers) i tył (rewers) fiszki.
  - Po zapisaniu nowa fiszka jest dodawana do bieżącego decku.

---
- ID: US-010
- Tytuł: Edycja fiszki
- Opis: Jako użytkownik, chcę móc edytować treść istniejącej fiszki, aby poprawić błędy lub ją uzupełnić.
- Kryteria akceptacji:
  - W widoku listy fiszek w decku każda fiszka ma opcję edycji.
  - Mogę zmodyfikować zarówno przód, jak i tył fiszki.
  - Zmiany są zapisywane i widoczne w decku oraz podczas nauki.

---
- ID: US-011
- Tytuł: Usuwanie fiszki
- Opis: Jako użytkownik, chcę mieć możliwość usunięcia pojedynczej fiszki, która stała się nieaktualna.
- Kryteria akceptacji:
  - Każda fiszka na liście ma opcję usunięcia.
  - Po potwierdzeniu fiszka jest trwale usuwana z decku.

### System nauki
---
- ID: US-012
- Tytuł: Rozpoczynanie sesji nauki
- Opis: Jako użytkownik, chcę wybrać deck i rozpocząć sesję nauki, aby powtórzyć materiał.
- Kryteria akceptacji:
  - Każdy deck na liście ma przycisk "Ucz się".
  - Po kliknięciu przechodzę do interfejsu nauki, gdzie wyświetlana jest pierwsza fiszka do powtórki.
  - System wybiera fiszki do powtórki na podstawie algorytmu powtórek.

---
- ID: US-013
- Tytuł: Ocenianie znajomości fiszki
- Opis: Podczas nauki, chcę ocenić, czy znałem odpowiedź na fiszkę, aby system mógł zaplanować jej kolejną powtórkę.
- Kryteria akceptacji:
  - Po odkryciu odpowiedzi (tyłu fiszki), widoczne są dwa przyciski: "Nie wiedziałem" i "Wiedziałem".
  - Po kliknięciu jednego z nich system zapisuje moją odpowiedź i wyświetla kolejną fiszkę.
  - Moja ocena wpływa na interwał następnej powtórki danej fiszki.

---
- ID: US-014
- Tytuł: Resetowanie postępu w decku
- Opis: Jako użytkownik, chcę mieć możliwość zresetowania całego postępu nauki w danym decku, aby zacząć naukę od początku.
- Kryteria akceptacji:
  - W ustawieniach decku znajduje się opcja "Zresetuj postęp".
  - System prosi o potwierdzenie przed wykonaniem operacji.
  - Po potwierdzeniu, historia powtórek dla wszystkich fiszek w tym decku jest czyszczona.

---
- ID: US-015
- Tytuł: Wyświetlanie statystyk
- Opis: Jako użytkownik, chcę widzieć podstawowe statystyki mojej nauki, aby śledzić swoje postępy.
- Kryteria akceptacji:
  - Na stronie głównej widoczna jest liczba fiszek, które powtórzyłem dzisiaj.
  - Na liście decków przy każdej nazwie widoczna jest całkowita liczba fiszek w danym decku.

## 6. Metryki sukcesu

- Jakość generacji AI: Co najmniej 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkowników podczas etapu przeglądu.
  - Sposób mierzenia: Zliczanie stosunku fiszek zaakceptowanych do wszystkich wygenerowanych w każdej sesji generowania.
- Adopcja funkcji AI: Co najmniej 75% wszystkich fiszek w systemie (we wszystkich deckach wszystkich użytkowników) to fiszki, które zostały stworzone przy użyciu generatora AI.
  - Sposób mierzenia: Analiza flagi pochodzenia każdej fiszki w bazie danych ("AI" vs "manualna").
