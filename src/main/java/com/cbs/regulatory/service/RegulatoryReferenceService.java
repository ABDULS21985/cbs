package com.cbs.regulatory.service;

import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RegulatoryReferenceService {

    private static final AtomicLong RETURN_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);
    private static final AtomicLong AMENDMENT_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 1000);
    private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    public String nextReturnRef(RegulatoryReturnTemplate template, LocalDate periodTo) {
        String period = (periodTo != null ? periodTo : LocalDate.now()).format(PERIOD_FORMAT);
        return "%s-%s-%s-%06d".formatted(
                template.getJurisdiction().name(),
                template.getReturnType().name(),
                period,
                RETURN_SEQUENCE.incrementAndGet()
        );
    }

    public String nextAmendmentRef(String originalReturnRef) {
        return "%s-AMD-%03d".formatted(originalReturnRef, AMENDMENT_SEQUENCE.incrementAndGet() % 1000);
    }
}
