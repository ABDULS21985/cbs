package com.cbs.proposition.service;
import com.cbs.proposition.entity.CustomerProposition; import com.cbs.proposition.repository.CustomerPropositionRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class PropositionService {
    private final CustomerPropositionRepository propositionRepository;
    @Transactional
    public CustomerProposition create(CustomerProposition prop) {
        prop.setPropositionCode("PROP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return propositionRepository.save(prop);
    }
    @Transactional
    public CustomerProposition activate(String code) {
        CustomerProposition p = propositionRepository.findByPropositionCode(code).orElseThrow();
        p.setStatus("ACTIVE");
        return propositionRepository.save(p);
    }
    public List<CustomerProposition> getActive() { return propositionRepository.findByStatusOrderByPropositionNameAsc("ACTIVE"); }
    public List<CustomerProposition> getBySegment(String segment) { return propositionRepository.findByTargetSegmentAndStatus(segment, "ACTIVE"); }
}
