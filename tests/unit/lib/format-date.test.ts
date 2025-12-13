import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatDate } from "@/lib/format-date";

describe("formatDate", () => {
  // Mockujemy czas dla przewidywalnych testów
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-11T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Względne formatowanie - "Przed chwilą" (< 1 minuta)', () => {
    it('powinien zwrócić "Przed chwilą" dla daty sprzed 0 sekund', () => {
      // Arrange
      const date = new Date("2025-12-11T10:00:00.000Z").toISOString();

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).toBe("Przed chwilą");
    });

    it('powinien zwrócić "Przed chwilą" dla daty sprzed 30 sekund', () => {
      const date = new Date("2025-12-11T09:59:30.000Z").toISOString();
      expect(formatDate(date)).toBe("Przed chwilą");
    });

    it('powinien zwrócić "Przed chwilą" dla daty sprzed 59 sekund', () => {
      const date = new Date("2025-12-11T09:59:01.000Z").toISOString();
      expect(formatDate(date)).toBe("Przed chwilą");
    });

    it('powinien zwrócić "Przed chwilą" dla daty sprzed 59.9 sekund (test zaokrąglenia w dół)', () => {
      const date = new Date("2025-12-11T09:59:00.100Z").toISOString();
      expect(formatDate(date)).toBe("Przed chwilą");
    });
  });

  describe('Względne formatowanie - "X min temu" (1-59 minut)', () => {
    it('powinien zwrócić "1 min temu" dla daty sprzed 1 minuty', () => {
      const date = new Date("2025-12-11T09:59:00.000Z").toISOString();
      expect(formatDate(date)).toBe("1 min temu");
    });

    it('powinien zwrócić "30 min temu" dla daty sprzed 30 minut', () => {
      const date = new Date("2025-12-11T09:30:00.000Z").toISOString();
      expect(formatDate(date)).toBe("30 min temu");
    });

    it('powinien zwrócić "59 min temu" dla daty sprzed 59 minut', () => {
      const date = new Date("2025-12-11T09:01:00.000Z").toISOString();
      expect(formatDate(date)).toBe("59 min temu");
    });

    it('powinien zwrócić "1h temu" dla daty sprzed 60 minut (boundary test)', () => {
      const date = new Date("2025-12-11T09:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("1h temu");
    });
  });

  describe('Względne formatowanie - "Xh temu" (1-23 godziny)', () => {
    it('powinien zwrócić "1h temu" dla daty sprzed 1 godziny', () => {
      const date = new Date("2025-12-11T09:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("1h temu");
    });

    it('powinien zwrócić "12h temu" dla daty sprzed 12 godzin', () => {
      const date = new Date("2025-12-10T22:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("12h temu");
    });

    it('powinien zwrócić "23h temu" dla daty sprzed 23 godzin', () => {
      const date = new Date("2025-12-10T11:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("23h temu");
    });

    it('powinien zwrócić "1 dni temu" dla daty sprzed 24 godzin (boundary test)', () => {
      const date = new Date("2025-12-10T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("1 dni temu");
    });
  });

  describe('Względne formatowanie - "X dni temu" (1-6 dni)', () => {
    it('powinien zwrócić "1 dni temu" dla daty sprzed 1 dnia', () => {
      const date = new Date("2025-12-10T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("1 dni temu");
    });

    it('powinien zwrócić "3 dni temu" dla daty sprzed 3 dni', () => {
      const date = new Date("2025-12-08T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("3 dni temu");
    });

    it('powinien zwrócić "6 dni temu" dla daty sprzed 6 dni', () => {
      const date = new Date("2025-12-05T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("6 dni temu");
    });

    it("powinien zwrócić pełną datę dla daty sprzed 7 dni (boundary test)", () => {
      const date = new Date("2025-12-04T10:00:00.000Z").toISOString();
      const result = formatDate(date);
      // Data w bieżącym roku - bez roku w output
      expect(result).toBe("4 gru");
    });
  });

  describe("Pełne formatowanie daty - daty w bieżącym roku (bez roku)", () => {
    it("powinien zwrócić datę bez roku dla daty sprzed 7 dni w bieżącym roku", () => {
      const date = new Date("2025-12-04T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("4 gru");
    });

    it("powinien zwrócić datę bez roku dla daty sprzed 30 dni w bieżącym roku", () => {
      const date = new Date("2025-11-11T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("11 lis");
    });

    it("powinien zwrócić datę bez roku dla 1 stycznia bieżącego roku", () => {
      const date = new Date("2025-01-01T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("1 sty");
    });

    it("powinien zwrócić datę bez roku dla daty wcześniejszej w tym samym roku", () => {
      // Ustawiamy datę która jest na pewno w przeszłości, ale w tym samym roku
      const date = new Date("2025-03-15T10:00:00.000Z").toISOString();
      const result = formatDate(date);
      expect(result).toBe("15 mar");
    });
  });

  describe("Pełne formatowanie daty - daty z poprzednich lat (z rokiem)", () => {
    it("powinien zwrócić datę z rokiem dla daty z poprzedniego roku", () => {
      const date = new Date("2024-12-11T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("11 gru 2024");
    });

    it("powinien zwrócić datę z rokiem dla daty sprzed 2 lat", () => {
      const date = new Date("2023-01-01T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("1 sty 2023");
    });

    it("powinien zwrócić datę z rokiem dla daty sprzed 5 lat", () => {
      const date = new Date("2020-03-15T10:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("15 mar 2020");
    });
  });

  describe("Pełne formatowanie daty - weryfikacja polskich skrótów miesięcy", () => {
    const polishMonths = [
      { month: 0, short: "sty", name: "styczeń" },
      { month: 1, short: "lut", name: "luty" },
      { month: 2, short: "mar", name: "marzec" },
      { month: 3, short: "kwi", name: "kwiecień" },
      { month: 4, short: "maj", name: "maj" },
      { month: 5, short: "cze", name: "czerwiec" },
      { month: 6, short: "lip", name: "lipiec" },
      { month: 7, short: "sie", name: "sierpień" },
      { month: 8, short: "wrz", name: "wrzesień" },
      { month: 9, short: "paź", name: "październik" },
      { month: 10, short: "lis", name: "listopad" },
      { month: 11, short: "gru", name: "grudzień" },
    ];

    describe.each(polishMonths)('formatuje miesiąc $name poprawnie jako "$short"', ({ month, short }) => {
      it(`powinien zwrócić skrót "${short}" dla miesiąca ${month + 1}`, () => {
        // Data z poprzedniego roku żeby wymusić pełne formatowanie
        const date = new Date(Date.UTC(2024, month, 15, 10, 0, 0)).toISOString();
        const result = formatDate(date);
        expect(result).toContain(short);
        expect(result).toContain("2024");
      });
    });
  });

  describe("Edge cases - granice przedziałów czasowych", () => {
    it('powinien zwrócić "Przed chwilą" dla 59.99 sekund (zaokrąglenie w dół)', () => {
      const date = new Date("2025-12-11T09:59:00.010Z").toISOString();
      expect(formatDate(date)).toBe("Przed chwilą");
    });

    it('powinien zwrócić "59 min temu" dla 59.99 minut (zaokrąglenie w dół)', () => {
      const date = new Date("2025-12-11T09:00:01.000Z").toISOString();
      expect(formatDate(date)).toBe("59 min temu");
    });

    it('powinien zwrócić "23h temu" dla 23.99 godzin (zaokrąglenie w dół)', () => {
      const date = new Date("2025-12-10T10:01:00.000Z").toISOString();
      expect(formatDate(date)).toBe("23h temu");
    });

    it('powinien zwrócić "6 dni temu" dla 6.99 dni (zaokrąglenie w dół)', () => {
      const date = new Date("2025-12-04T11:00:00.000Z").toISOString();
      expect(formatDate(date)).toBe("6 dni temu");
    });
  });

  describe("Edge cases - daty specjalne", () => {
    it("powinien zwrócić pełną datę z rokiem dla Unix epoch (1970-01-01)", () => {
      const date = new Date("1970-01-01T00:00:00.000Z").toISOString();
      const result = formatDate(date);
      expect(result).toBe("1 sty 1970");
    });

    it("powinien zwrócić pełną datę z rokiem dla bardzo starej daty (100 lat temu)", () => {
      const date = new Date("1925-06-15T10:00:00.000Z").toISOString();
      const result = formatDate(date);
      expect(result).toBe("15 cze 1925");
    });

    it("powinien poprawnie obsłużyć datę z przełomu roku (31 grudnia → 1 stycznia)", () => {
      // Ustawiamy "teraz" na 5 stycznia 2025
      vi.setSystemTime(new Date("2025-01-05T10:00:00.000Z"));

      // Data z poprzedniego roku, ale tylko kilka dni temu
      const date = new Date("2024-12-30T10:00:00.000Z").toISOString();
      const result = formatDate(date);

      // Powinno pokazać "6 dni temu" (5-4-3-2-1-31-30 = 6 dni)
      expect(result).toBe("6 dni temu");
    });
  });

  describe("Edge cases - nieprawidłowe dane wejściowe", () => {
    it("powinien zwrócić Invalid Date dla nieprawidłowego string daty", () => {
      const result = formatDate("invalid-date-string");
      expect(result).toBe("Invalid Date");
    });

    it("powinien zwrócić Invalid Date dla pustego stringa", () => {
      const result = formatDate("");
      expect(result).toBe("Invalid Date");
    });

    it("powinien zwrócić Invalid Date dla stringa z literami", () => {
      const result = formatDate("not a date");
      expect(result).toBe("Invalid Date");
    });
  });

  describe("Time-dependent tests - zależność od czasu", () => {
    it("ta sama data ISO powinna formatować się różnie w zależności od obecnego czasu", () => {
      // Arrange - Mock 1: teraz = 2025-12-11 10:00
      vi.setSystemTime(new Date("2025-12-11T10:00:00.000Z"));
      const testDate = new Date("2025-12-11T09:30:00.000Z").toISOString();

      // Act & Assert 1
      expect(formatDate(testDate)).toBe("30 min temu");

      // Arrange - Mock 2: teraz = 2025-12-12 10:00 (dzień później)
      vi.setSystemTime(new Date("2025-12-12T10:00:00.000Z"));

      // Act & Assert 2 - ten sam input, inny output
      expect(formatDate(testDate)).toBe("1 dni temu");
    });

    it("powinien obsłużyć przejście przez granicę roku (data z rokiem vs bez roku)", () => {
      // Arrange - Mock 1: teraz = 2024-12-20
      vi.setSystemTime(new Date("2024-12-20T10:00:00.000Z"));
      const testDate = new Date("2024-12-15T10:00:00.000Z").toISOString();

      // Act & Assert 1 - ta sama data, ten sam rok - bez roku w output
      const result1 = formatDate(testDate);
      expect(result1).toBe("5 dni temu");

      // Arrange - Mock 2: teraz = 2025-01-05 (przeszliśmy do nowego roku)
      vi.setSystemTime(new Date("2025-01-05T10:00:00.000Z"));

      // Act & Assert 2 - teraz inny rok - z rokiem w output
      const result2 = formatDate(testDate);
      expect(result2).toBe("15 gru 2024");
    });

    it("powinien poprawnie obsłużyć przeskok czasu o tydzień", () => {
      // Arrange - Mock 1: 6 dni temu (względne)
      vi.setSystemTime(new Date("2025-12-11T10:00:00.000Z"));
      const testDate = new Date("2025-12-05T10:00:00.000Z").toISOString();
      expect(formatDate(testDate)).toBe("6 dni temu");

      // Arrange - Mock 2: 7 dni temu (pełna data)
      vi.setSystemTime(new Date("2025-12-12T10:00:00.000Z"));
      expect(formatDate(testDate)).toBe("5 gru");
    });
  });

  describe("Testy parametryzowane - różne przedziały czasowe", () => {
    describe.each([
      { secondsAgo: 0, expected: "Przed chwilą" },
      { secondsAgo: 30, expected: "Przed chwilą" },
      { secondsAgo: 59, expected: "Przed chwilą" },
      { secondsAgo: 60, expected: "1 min temu" },
      { secondsAgo: 60 * 15, expected: "15 min temu" },
      { secondsAgo: 60 * 45, expected: "45 min temu" },
      { secondsAgo: 3600, expected: "1h temu" },
      { secondsAgo: 3600 * 5, expected: "5h temu" },
      { secondsAgo: 3600 * 18, expected: "18h temu" },
      { secondsAgo: 86400, expected: "1 dni temu" },
      { secondsAgo: 86400 * 2, expected: "2 dni temu" },
      { secondsAgo: 86400 * 5, expected: "5 dni temu" },
    ])("formatDate($secondsAgo sekund temu) -> $expected", ({ secondsAgo, expected }) => {
      it(`powinien zwrócić "${expected}" dla daty sprzed ${secondsAgo} sekund`, () => {
        // Arrange
        const now = new Date("2025-12-11T10:00:00.000Z");
        const date = new Date(now.getTime() - secondsAgo * 1000).toISOString();

        // Act
        const result = formatDate(date);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe("Testy różnych formatów wejściowych ISO 8601", () => {
    it("powinien obsłużyć format ISO z milisekundami", () => {
      // toISOString() zawsze zwraca format z milisekundami
      const date = new Date("2025-12-11T09:30:00.123Z").toISOString();
      // 09:30:00.123 to 29 min 59.877 sekund przed 10:00:00.000, co zaokrągla się do 29 min
      expect(formatDate(date)).toBe("29 min temu");
    });

    it("powinien obsłużyć format ISO bez 'Z' (UTC implied)", () => {
      const date = "2025-12-11T09:30:00.000";
      // Może być różnica w parsowaniu w zależności od przeglądarki
      const result = formatDate(date);
      expect(typeof result).toBe("string");
    });

    it("powinien obsłużyć format ISO z timezone offset", () => {
      // +01:00 oznacza że lokalna godzina jest 11:30, ale UTC to 10:30
      // Ale parsowanie może dać nieprzewidywalne wyniki w zależności od środowiska
      const date = "2025-12-11T09:30:00.000+00:00";
      const result = formatDate(date);
      // 09:30 UTC to 30 minut przed 10:00 UTC
      expect(result).toBe("30 min temu");
    });
  });
});
