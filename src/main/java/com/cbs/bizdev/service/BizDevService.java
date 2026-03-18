package com.cbs.bizdev.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.bizdev.entity.BizDevInitiative;
import com.cbs.bizdev.repository.BizDevInitiativeRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List; import java.util.Map; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BizDevService {
    private final BizDevInitiativeRepository repository;

    @Transactional
    public BizDevInitiative create(BizDevInitiative init) {
        init.setInitiativeCode("BDI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        init.setStatus("PROPOSED");
        return repository.save(init);
    }
    @Transactional
    public BizDevInitiative approve(String code) {
        BizDevInitiative i = getByCode(code);
        i.setStatus("APPROVED");
        return repository.save(i);
    }
    @Transactional
    public BizDevInitiative updateProgress(String code, BigDecimal progressPct, Map<String, Object> kpis) {
        BizDevInitiative i = getByCode(code);
        i.setProgressPct(progressPct);
        i.setKpis(kpis);
        if (!"IN_PROGRESS".equals(i.getStatus())) { i.setStatus("IN_PROGRESS"); i.setActualStartDate(LocalDate.now()); }
        return repository.save(i);
    }
    @Transactional
    public BizDevInitiative complete(String code) {
        BizDevInitiative i = getByCode(code);
        i.setStatus("COMPLETED");
        i.setActualEndDate(LocalDate.now());
        i.setProgressPct(new BigDecimal("100"));
        return repository.save(i);
    }
    public List<BizDevInitiative> getByStatus(String status) { return repository.findByStatusOrderByPlannedStartDateAsc(status); }
    public List<BizDevInitiative> getActive() { return repository.findByStatusInOrderByPlannedStartDateAsc(List.of("APPROVED", "IN_PROGRESS")); }
    public BizDevInitiative getByCode(String code) {
        return repository.findByInitiativeCode(code).orElseThrow(() -> new ResourceNotFoundException("BizDevInitiative", "initiativeCode", code));
    }
}
