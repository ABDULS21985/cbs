package com.cbs.saleslead.service;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.saleslead.entity.SalesLead;
import com.cbs.saleslead.repository.SalesLeadRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SalesLeadService {
    private final SalesLeadRepository leadRepository;
    @Transactional
    public SalesLead createLead(SalesLead lead) {
        lead.setLeadNumber("LD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        SalesLead saved = leadRepository.save(lead);
        log.info("Lead created: number={}, source={}, product={}", saved.getLeadNumber(), saved.getLeadSource(), saved.getProductInterest());
        return saved;
    }
    @Transactional
    public SalesLead advanceStage(String leadNumber, String newStage, String reason) {
        SalesLead l = getLead(leadNumber);
        List<String> validNext = switch (l.getStage()) {
            case "NEW" -> List.of("CONTACTED","DISQUALIFIED");
            case "CONTACTED" -> List.of("QUALIFIED","DISQUALIFIED","LOST");
            case "QUALIFIED" -> List.of("PROPOSAL","DISQUALIFIED","LOST");
            case "PROPOSAL" -> List.of("NEGOTIATION","LOST");
            case "NEGOTIATION" -> List.of("WON","LOST");
            default -> List.of();
        };
        if (!validNext.contains(newStage)) throw new BusinessException("Invalid stage transition: " + l.getStage() + " → " + newStage);
        l.setStage(newStage);
        if ("LOST".equals(newStage) || "DISQUALIFIED".equals(newStage)) l.setLostReason(reason);
        l.setUpdatedAt(Instant.now());
        log.info("Lead stage advanced: number={}, stage={}", leadNumber, newStage);
        return leadRepository.save(l);
    }
    @Transactional
    public SalesLead assign(String leadNumber, String assignedTo) {
        SalesLead l = getLead(leadNumber); l.setAssignedTo(assignedTo); l.setUpdatedAt(Instant.now()); return leadRepository.save(l);
    }
    public List<SalesLead> getByAssignee(String assignedTo) {
        return leadRepository.findByAssignedToAndStageInOrderByLeadScoreDesc(assignedTo, List.of("NEW","CONTACTED","QUALIFIED","PROPOSAL","NEGOTIATION"));
    }
    public List<SalesLead> getByStage(String stage) { return leadRepository.findByStageOrderByLeadScoreDesc(stage); }
    private SalesLead getLead(String number) { return leadRepository.findByLeadNumber(number).orElseThrow(() -> new ResourceNotFoundException("SalesLead", "leadNumber", number)); }
}
