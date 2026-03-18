package com.cbs.finstrument.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.finstrument.entity.FinancialInstrument;
import com.cbs.finstrument.repository.FinancialInstrumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FinancialInstrumentService {

    private final FinancialInstrumentRepository instrumentRepository;

    @Transactional
    public FinancialInstrument create(FinancialInstrument instrument) {
        if (instrument.getInstrumentCode() == null) {
            instrument.setInstrumentCode("FI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        log.info("Instrument created: code={}, type={}, isin={}",
                instrument.getInstrumentCode(), instrument.getInstrumentType(), instrument.getIsin());
        return instrumentRepository.save(instrument);
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
}
