package com.cbs;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Random;
import java.util.UUID;

public class TestDataFactory {
    private static final Random random = new Random();
    private static final String[] CURRENCIES = {"USD", "EUR", "GBP", "NGN"};
    private static final String[] FIRST_NAMES = {"John", "Jane", "Ahmed", "Maria", "Oluwole", "Fatima", "David", "Sarah"};
    private static final String[] LAST_NAMES = {"Smith", "Johnson", "Ibrahim", "Garcia", "Okafor", "Hassan", "Williams", "Brown"};

    public static String code(String prefix) { return prefix + "-TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(); }
    public static String name() { return FIRST_NAMES[random.nextInt(FIRST_NAMES.length)] + " " + LAST_NAMES[random.nextInt(LAST_NAMES.length)]; }
    public static String company() { return "Test Corp " + random.nextInt(1000); }
    public static BigDecimal amount(double min, double max) { return BigDecimal.valueOf(min + random.nextDouble() * (max - min)).setScale(4, java.math.RoundingMode.HALF_UP); }
    public static LocalDate pastDate(int maxDays) { return LocalDate.now().minusDays(random.nextInt(maxDays) + 1); }
    public static LocalDate futureDate(int maxDays) { return LocalDate.now().plusDays(random.nextInt(maxDays) + 1); }
    public static String currency() { return CURRENCIES[random.nextInt(CURRENCIES.length)]; }
    public static String bic() { return UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "XXX"; }
    public static String isin() { return "US" + UUID.randomUUID().toString().substring(0, 9).toUpperCase().replaceAll("[^A-Z0-9]", "X") + "0"; }
}
