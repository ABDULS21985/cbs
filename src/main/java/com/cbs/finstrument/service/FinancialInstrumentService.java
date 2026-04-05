package com.cbs.finstrument.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.finstrument.entity.FinancialInstrument;
import com.cbs.finstrument.repository.FinancialInstrumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FinancialInstrumentService {

    private final FinancialInstrumentRepository instrumentRepository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_INSTRUMENT_TYPES = Set.of(
            "BOND", "EQUITY", "SUKUK", "FUND", "ETF", "DERIVATIVE", "STRUCTURED_NOTE",
            "MONEY_MARKET", "TREASURY_BILL", "COMMERCIAL_PAPER", "CERTIFICATE_OF_DEPOSIT"
    );

    private static final Set<String> VALID_ASSET_CLASSES = Set.of(
            "FIXED_INCOME", "EQUITY", "MONEY_MARKET", "COMMODITIES", "FX", "DERIVATIVES", "ALTERNATIVE"
    );

    private static final Set<String> VALID_IFRS9_CLASSIFICATIONS = Set.of(
            "FVTPL", "FVOCI", "AMORTIZED_COST"
    );

    @Transactional
    public FinancialInstrument create(FinancialInstrument instrument) {
        validateInstrument(instrument);

        // Duplicate ISIN check
        if (instrument.getIsin() != null && !instrument.getIsin().isBlank()) {
            validateIsinFormat(instrument.getIsin());
            instrumentRepository.findByIsin(instrument.getIsin()).ifPresent(existing -> {
                throw new BusinessException("Instrument with ISIN " + instrument.getIsin()
                        + " already exists: " + existing.getInstrumentCode());
            });
        }

        if (instrument.getInstrumentCode() == null) {
            instrument.setInstrumentCode("FI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        } else {
            // Duplicate code check
            instrumentRepository.findByInstrumentCode(instrument.getInstrumentCode()).ifPresent(existing -> {
                throw new BusinessException("Instrument with code " + instrument.getInstrumentCode() + " already exists");
            });
        }

        if (instrument.getIsActive() == null) {
            instrument.setIsActive(true);
        }

        FinancialInstrument saved = instrumentRepository.save(instrument);
        log.info("Instrument created by {}: code={}, type={}, isin={}, assetClass={}",
                actorProvider.getCurrentActor(), saved.getInstrumentCode(),
                saved.getInstrumentType(), saved.getIsin(), saved.getAssetClass());
        return saved;
    }

    @Transactional
    public FinancialInstrument update(String code, FinancialInstrument updates) {
        FinancialInstrument existing = getByCode(code);

        if (updates.getInstrumentName() != null) existing.setInstrumentName(updates.getInstrumentName());
        if (updates.getCreditRating() != null) existing.setCreditRating(updates.getCreditRating());
        if (updates.getRatingAgency() != null) existing.setRatingAgency(updates.getRatingAgency());
        if (updates.getCouponRate() != null) existing.setCouponRate(updates.getCouponRate());
        if (updates.getExchange() != null) existing.setExchange(updates.getExchange());

        // If ISIN is being changed, validate format and uniqueness
        if (updates.getIsin() != null && !updates.getIsin().equals(existing.getIsin())) {
            validateIsinFormat(updates.getIsin());
            instrumentRepository.findByIsin(updates.getIsin()).ifPresent(dup -> {
                throw new BusinessException("ISIN " + updates.getIsin() + " already assigned to instrument " + dup.getInstrumentCode());
            });
            existing.setIsin(updates.getIsin());
        }

        log.info("Instrument updated by {}: code={}", actorProvider.getCurrentActor(), code);
        return instrumentRepository.save(existing);
    }

    /**
     * Classifies an instrument under IFRS 9 (FVTPL, FVOCI, or AMORTIZED_COST).
     * The classification is stored on the asset class field as a supplementary designation.
     */
    @Transactional
    public FinancialInstrument classifyIfrs9(String code, String classification) {
        if (classification == null || !VALID_IFRS9_CLASSIFICATIONS.contains(classification.toUpperCase())) {
            throw new BusinessException("Invalid IFRS 9 classification: " + classification
                    + ". Valid: " + VALID_IFRS9_CLASSIFICATIONS);
        }

        FinancialInstrument instrument = getByCode(code);

        // Business rules for IFRS 9 classification
        String type = instrument.getInstrumentType() != null ? instrument.getInstrumentType().toUpperCase() : "";
        if ("AMORTIZED_COST".equals(classification.toUpperCase())) {
            // Amortized cost only for debt instruments held to collect contractual cash flows
            if ("EQUITY".equals(type) || "FUND".equals(type) || "ETF".equals(type)) {
                throw new BusinessException("Equity instruments cannot be classified as AMORTIZED_COST under IFRS 9");
            }
        }
        if ("FVOCI".equals(classification.toUpperCase()) && "DERIVATIVE".equals(type)) {
            throw new BusinessException("Derivatives must be classified as FVTPL under IFRS 9");
        }

        instrument.setAssetClass(instrument.getAssetClass() + "|" + classification.toUpperCase());
        log.info("IFRS 9 classification set by {}: code={}, classification={}",
                actorProvider.getCurrentActor(), code, classification);
        return instrumentRepository.save(instrument);
    }

    /**
     * Processes matured instruments: deactivates any instrument past its maturity date.
     * Returns the list of instruments that were matured.
     */
    @Transactional
    public List<FinancialInstrument> processMaturedInstruments() {
        List<FinancialInstrument> all = instrumentRepository.findAll();
        LocalDate today = LocalDate.now();
        List<FinancialInstrument> matured = new ArrayList<>();

        for (FinancialInstrument inst : all) {
            if (inst.getIsActive() && inst.getMaturityDate() != null && !inst.getMaturityDate().isAfter(today)) {
                inst.setIsActive(false);
                instrumentRepository.save(inst);
                matured.add(inst);
                log.info("Instrument matured by system: code={}, maturityDate={}",
                        inst.getInstrumentCode(), inst.getMaturityDate());
            }
        }

        log.info("Maturity processing completed by {}: {} instruments matured",
                actorProvider.getCurrentActor(), matured.size());
        return matured;
    }

    public FinancialInstrument getByCode(String code) {
        return instrumentRepository.findByInstrumentCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("FinancialInstrument", "instrumentCode", code));
    }

    public Optional<FinancialInstrument> getByIsin(String isin) {
        return instrumentRepository.findByIsin(isin);
    }

    public List<FinancialInstrument> getByType(String type) {
        return instrumentRepository.findByInstrumentTypeAndIsActiveTrueOrderByInstrumentNameAsc(type);
    }

    public List<FinancialInstrument> getByAssetClass(String assetClass) {
        return instrumentRepository.findByAssetClassAndIsActiveTrueOrderByInstrumentNameAsc(assetClass);
    }

    // ---- private helpers ----

    private void validateInstrument(FinancialInstrument instrument) {
        if (instrument.getInstrumentName() == null || instrument.getInstrumentName().isBlank()) {
            throw new BusinessException("Instrument name is required");
        }
        if (instrument.getInstrumentType() == null || instrument.getInstrumentType().isBlank()) {
            throw new BusinessException("Instrument type is required");
        }
        if (!VALID_INSTRUMENT_TYPES.contains(instrument.getInstrumentType().toUpperCase())) {
            throw new BusinessException("Invalid instrument type: " + instrument.getInstrumentType()
                    + ". Valid types: " + VALID_INSTRUMENT_TYPES);
        }
        if (instrument.getAssetClass() == null || instrument.getAssetClass().isBlank()) {
            throw new BusinessException("Asset class is required");
        }
        if (!VALID_ASSET_CLASSES.contains(instrument.getAssetClass().toUpperCase())) {
            throw new BusinessException("Invalid asset class: " + instrument.getAssetClass()
                    + ". Valid: " + VALID_ASSET_CLASSES);
        }
        if (instrument.getCurrency() == null || instrument.getCurrency().length() != 3) {
            throw new BusinessException("Currency must be a 3-letter ISO code");
        }
        // Maturity date must be in the future for new instruments
        if (instrument.getMaturityDate() != null && instrument.getMaturityDate().isBefore(LocalDate.now())) {
            throw new BusinessException("Maturity date cannot be in the past for new instruments");
        }
        // Coupon rate range check
        if (instrument.getCouponRate() != null && instrument.getCouponRate().signum() < 0) {
            throw new BusinessException("Coupon rate cannot be negative");
        }
        // Face value must be positive
        if (instrument.getFaceValue() != null && instrument.getFaceValue().signum() <= 0) {
            throw new BusinessException("Face value must be positive");
        }
    }

    /**
     * Validates ISIN format: 2-letter country code + 9 alphanumeric chars + 1 check digit.
     */
    private void validateIsinFormat(String isin) {
        if (isin == null || isin.length() != 12) {
            throw new BusinessException("ISIN must be exactly 12 characters");
        }
        if (!isin.matches("^[A-Z]{2}[A-Z0-9]{9}[0-9]$")) {
            throw new BusinessException("Invalid ISIN format. Expected: 2 letter country code + 9 alphanumeric + 1 check digit");
        }
    }
}
