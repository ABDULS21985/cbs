package com.cbs.econcapital.service;
import com.cbs.econcapital.entity.EconomicCapital;
import com.cbs.econcapital.repository.EconomicCapitalRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class EconomicCapitalService {
    private final EconomicCapitalRepository capitalRepository;
    @Transactional
    public EconomicCapital calculate(EconomicCapital ec) {
        ec.setCapitalSurplusDeficit(ec.getAvailableCapital() != null ? ec.getAvailableCapital().subtract(ec.getEconomicCapital()) : null);
        if (ec.getAllocatedCapital() != null && ec.getAllocatedCapital().signum() > 0 && ec.getUnexpectedLoss() != null)
            ec.setRarocPct(ec.getUnexpectedLoss().divide(ec.getAllocatedCapital(), 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        EconomicCapital saved = capitalRepository.save(ec);
        log.info("Economic capital: date={}, type={}, ecap={}, surplus={}", ec.getCalcDate(), ec.getRiskType(), ec.getEconomicCapital(), ec.getCapitalSurplusDeficit());
        return saved;
    }
    public List<EconomicCapital> getByDate(LocalDate date) { return capitalRepository.findByCalcDateOrderByRiskTypeAsc(date); }
    public List<EconomicCapital> getByBusinessUnit(LocalDate date, String bu) { return capitalRepository.findByCalcDateAndBusinessUnitOrderByRiskTypeAsc(date, bu); }
}
