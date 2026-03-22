package com.cbs.alm.scheduler;

import com.cbs.alm.entity.AlmRegulatoryReturn;
import com.cbs.alm.repository.AlmRegulatoryReturnRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.List;

/**
 * Ensures the 5 standard ALM regulatory returns (IRRBB, LCR, NSFR, SLR, LER) exist
 * in the database at application startup. This is a safety net for environments where
 * Flyway migration V67 has not yet run, or where the returns were accidentally deleted.
 *
 * <p>Each return is only inserted if it does not already exist (checked by code).
 * Existing returns are never modified by this seeder.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlmRegulatoryReturnSeeder {

    private final AlmRegulatoryReturnRepository regulatoryReturnRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedRegulatoryReturns() {
        List<String> existingCodes = regulatoryReturnRepository.findAllByOrderByNextDueAsc()
                .stream()
                .map(AlmRegulatoryReturn::getCode)
                .toList();

        int seeded = 0;

        seeded += seedIfMissing(existingCodes, "IRRBB", "IRRBB Report", "QUARTERLY");
        seeded += seedIfMissing(existingCodes, "LCR", "LCR Return", "DAILY");
        seeded += seedIfMissing(existingCodes, "NSFR", "NSFR Return", "MONTHLY");
        seeded += seedIfMissing(existingCodes, "SLR", "Structural Liquidity Return", "MONTHLY");
        seeded += seedIfMissing(existingCodes, "LER", "Large Exposure Return", "QUARTERLY");

        if (seeded > 0) {
            log.info("ALM regulatory return seeder: {} return(s) created", seeded);
        } else {
            log.debug("ALM regulatory return seeder: all 5 standard returns already exist");
        }
    }

    private int seedIfMissing(List<String> existingCodes, String code, String name, String frequency) {
        if (existingCodes.contains(code)) {
            return 0;
        }

        LocalDate dueDate = computeNextDueDate(frequency);
        LocalDate nextDue = computeNextDueDate(frequency, dueDate);

        AlmRegulatoryReturn ret = AlmRegulatoryReturn.builder()
                .code(code)
                .name(name)
                .frequency(frequency)
                .dueDate(dueDate)
                .nextDue(nextDue)
                .status("DRAFT")
                .build();

        regulatoryReturnRepository.save(ret);
        log.info("Seeded regulatory return: {} ({}, {})", code, name, frequency);
        return 1;
    }

    /**
     * Computes the next due date for a given frequency relative to today.
     */
    private LocalDate computeNextDueDate(String frequency) {
        LocalDate today = LocalDate.now();
        return switch (frequency) {
            case "DAILY" -> today.plusDays(1);
            case "MONTHLY" -> today.withDayOfMonth(1).plusMonths(1).minusDays(1);
            case "QUARTERLY" -> {
                int currentQuarter = today.get(IsoFields.QUARTER_OF_YEAR);
                LocalDate endOfQuarter = today.withMonth(currentQuarter * 3).withDayOfMonth(1)
                        .plusMonths(1).minusDays(1);
                yield endOfQuarter.isBefore(today) ? endOfQuarter.plusMonths(3) : endOfQuarter;
            }
            default -> today.plusMonths(1);
        };
    }

    /**
     * Computes the following due date after a given reference date.
     */
    private LocalDate computeNextDueDate(String frequency, LocalDate reference) {
        return switch (frequency) {
            case "DAILY" -> reference.plusDays(1);
            case "MONTHLY" -> reference.plusMonths(1);
            case "QUARTERLY" -> reference.plusMonths(3);
            default -> reference.plusMonths(1);
        };
    }
}
