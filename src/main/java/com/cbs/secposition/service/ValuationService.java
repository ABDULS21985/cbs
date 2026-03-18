package com.cbs.secposition.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.secposition.entity.InstrumentValuation;
import com.cbs.secposition.entity.ValuationModel;
import com.cbs.secposition.entity.ValuationRun;
import com.cbs.secposition.repository.InstrumentValuationRepository;
import com.cbs.secposition.repository.ValuationModelRepository;
import com.cbs.secposition.repository.ValuationRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ValuationService {

    private final ValuationModelRepository modelRepository;
    private final ValuationRunRepository runRepository;
    private final InstrumentValuationRepository instrumentValuationRepository;

    @Transactional
    public ValuationModel defineModel(ValuationModel model) {
        model.setModelCode("VM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        model.setStatus("DEVELOPMENT");
        ValuationModel saved = modelRepository.save(model);
        log.info("Valuation model defined: {}", saved.getModelCode());
        return saved;
    }

    @Transactional
    public ValuationRun runValuation(Long modelId, LocalDate date, String runType) {
        ValuationRun run = ValuationRun.builder()
                .runRef("VR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase())
                .modelId(modelId)
                .valuationDate(date)
                .runType(runType)
                .runStartedAt(Instant.now())
                .status("RUNNING")
                .build();
        ValuationRun saved = runRepository.save(run);
        log.info("Valuation run started: {}", saved.getRunRef());
        return saved;
    }

    @Transactional
    public InstrumentValuation recordInstrumentValuation(InstrumentValuation valuation) {
        if (valuation.getModelUsed() != null) {
            modelRepository.findByModelCode(valuation.getModelUsed()).ifPresent(model -> {
                if (model.getIpvThresholdPct() != null
                        && valuation.getModelPrice() != null
                        && valuation.getMarketPrice() != null
                        && valuation.getMarketPrice().compareTo(BigDecimal.ZERO) != 0) {
                    BigDecimal deviation = valuation.getModelPrice().subtract(valuation.getMarketPrice())
                            .abs()
                            .divide(valuation.getMarketPrice(), 6, RoundingMode.HALF_UP)
                            .multiply(new BigDecimal("100"));
                    valuation.setPriceDeviation(deviation);
                    if (deviation.compareTo(model.getIpvThresholdPct()) > 0) {
                        valuation.setDeviationBreached(true);
                    }
                }
            });
        }
        InstrumentValuation saved = instrumentValuationRepository.save(valuation);
        log.info("Instrument valuation recorded: instrument={}, run={}", saved.getInstrumentCode(), saved.getRunId());
        return saved;
    }

    @Transactional
    public ValuationRun completeRun(String runRef) {
        ValuationRun run = getRunByRef(runRef);
        List<InstrumentValuation> valuations = instrumentValuationRepository.findByRunId(run.getId());

        run.setInstrumentsValued(valuations.size());

        BigDecimal level1 = BigDecimal.ZERO;
        BigDecimal level2 = BigDecimal.ZERO;
        BigDecimal level3 = BigDecimal.ZERO;
        int breachCount = 0;

        for (InstrumentValuation v : valuations) {
            BigDecimal price = v.getMarketPrice() != null ? v.getMarketPrice() : BigDecimal.ZERO;
            if ("Level1".equals(v.getFairValueLevel())) {
                level1 = level1.add(price);
            } else if ("Level2".equals(v.getFairValueLevel())) {
                level2 = level2.add(price);
            } else if ("Level3".equals(v.getFairValueLevel())) {
                level3 = level3.add(price);
            }
            if (Boolean.TRUE.equals(v.getDeviationBreached())) {
                breachCount++;
            }
        }

        run.setFairValueLevel1Total(level1);
        run.setFairValueLevel2Total(level2);
        run.setFairValueLevel3Total(level3);
        run.setIpvBreachCount(breachCount);
        run.setRunCompletedAt(Instant.now());
        run.setStatus(breachCount > 0 ? "COMPLETED_WITH_EXCEPTIONS" : "COMPLETED");

        ValuationRun saved = runRepository.save(run);
        log.info("Valuation run completed: {}, instruments={}, breaches={}", runRef, valuations.size(), breachCount);
        return saved;
    }

    public ValuationRun getValuationSummary(String runRef) {
        return getRunByRef(runRef);
    }

    public List<InstrumentValuation> getExceptions(String runRef) {
        ValuationRun run = getRunByRef(runRef);
        return instrumentValuationRepository.findByRunIdAndDeviationBreachedTrue(run.getId());
    }

    public Map<String, BigDecimal> getFairValueDisclosure(String runRef) {
        ValuationRun run = getRunByRef(runRef);
        Map<String, BigDecimal> disclosure = new LinkedHashMap<>();
        disclosure.put("level1Total", run.getFairValueLevel1Total() != null ? run.getFairValueLevel1Total() : BigDecimal.ZERO);
        disclosure.put("level2Total", run.getFairValueLevel2Total() != null ? run.getFairValueLevel2Total() : BigDecimal.ZERO);
        disclosure.put("level3Total", run.getFairValueLevel3Total() != null ? run.getFairValueLevel3Total() : BigDecimal.ZERO);
        return disclosure;
    }

    public List<ValuationModel> getAllModels() {
        return modelRepository.findAll();
    }

    public ValuationModel getModelByCode(String code) {
        return modelRepository.findByModelCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ValuationModel", "modelCode", code));
    }

    private ValuationRun getRunByRef(String ref) {
        return runRepository.findByRunRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("ValuationRun", "runRef", ref));
    }
}
