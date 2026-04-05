package com.cbs.saleslead.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.saleslead.entity.SalesLead;
import com.cbs.saleslead.repository.SalesLeadRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SalesLeadService {
    private final SalesLeadRepository leadRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public SalesLead createLead(SalesLead lead) {
        // Validate required fields
        if (!StringUtils.hasText(lead.getLeadSource())) {
            throw new BusinessException("Lead source is required", "MISSING_LEAD_SOURCE");
        }
        if (!StringUtils.hasText(lead.getProductInterest())) {
            throw new BusinessException("Product interest is required", "MISSING_PRODUCT_INTEREST");
        }
        if (!StringUtils.hasText(lead.getProspectName())) {
            throw new BusinessException("Prospect name is required", "MISSING_PROSPECT_NAME");
        }

        // Duplicate lead detection: same prospect email + product
        if (StringUtils.hasText(lead.getProspectEmail())) {
            leadRepository.findFirstByProspectEmailAndProductInterestAndStageIn(
                    lead.getProspectEmail(), lead.getProductInterest(),
                    List.of("NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION")
            ).ifPresent(existing -> {
                throw new BusinessException(
                        "Duplicate lead exists for prospect " + lead.getProspectEmail()
                                + " with product " + lead.getProductInterest()
                                + " (lead: " + existing.getLeadNumber() + ")",
                        "DUPLICATE_LEAD");
            });
        }

        lead.setLeadNumber("LD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        lead.setStage("NEW");

        // Lead scoring based on source and product
        lead.setLeadScore(calculateLeadScore(lead));

        SalesLead saved = leadRepository.save(lead);
        log.info("AUDIT: Lead created: number={}, source={}, product={}, score={}, actor={}",
                saved.getLeadNumber(), saved.getLeadSource(), saved.getProductInterest(),
                saved.getLeadScore(), currentActorProvider.getCurrentActor());
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
        if (!validNext.contains(newStage)) throw new BusinessException("Invalid stage transition: " + l.getStage() + " -> " + newStage);
        String previousStage = l.getStage();
        l.setStage(newStage);
        if ("LOST".equals(newStage) || "DISQUALIFIED".equals(newStage)) {
            if (!StringUtils.hasText(reason)) {
                throw new BusinessException("Reason is required when marking lead as " + newStage, "MISSING_REASON");
            }
            l.setLostReason(reason);
        }
        l.setUpdatedAt(Instant.now());
        SalesLead saved = leadRepository.save(l);
        log.info("AUDIT: Lead stage advanced: number={}, from={}, to={}, actor={}",
                leadNumber, previousStage, newStage, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SalesLead assign(String leadNumber, String assignedTo) {
        if (!StringUtils.hasText(assignedTo)) {
            throw new BusinessException("assignedTo is required", "MISSING_ASSIGNEE");
        }
        SalesLead l = getLead(leadNumber);
        String previousAssignee = l.getAssignedTo();
        l.setAssignedTo(assignedTo);
        l.setUpdatedAt(Instant.now());
        SalesLead saved = leadRepository.save(l);
        log.info("AUDIT: Lead assigned: number={}, from={}, to={}, actor={}",
                leadNumber, previousAssignee, assignedTo, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<SalesLead> getAllLeads() { return leadRepository.findAll(); }
    public List<SalesLead> getByAssignee(String assignedTo) {
        return leadRepository.findByAssignedToAndStageInOrderByLeadScoreDesc(assignedTo, List.of("NEW","CONTACTED","QUALIFIED","PROPOSAL","NEGOTIATION"));
    }
    public List<SalesLead> getByStage(String stage) { return leadRepository.findByStageOrderByLeadScoreDesc(stage); }
    private SalesLead getLead(String number) { return leadRepository.findByLeadNumber(number).orElseThrow(() -> new ResourceNotFoundException("SalesLead", "leadNumber", number)); }

    private int calculateLeadScore(SalesLead lead) {
        int score = 50; // base score
        // High-value product interest
        if (lead.getProductInterest() != null) {
            String product = lead.getProductInterest().toUpperCase();
            if (product.contains("MORTGAGE") || product.contains("LOAN")) score += 20;
            if (product.contains("CORPORATE") || product.contains("TRADE")) score += 15;
            if (product.contains("INVESTMENT") || product.contains("WEALTH")) score += 15;
        }
        // Source quality scoring
        if (lead.getLeadSource() != null) {
            String source = lead.getLeadSource().toUpperCase();
            if (source.contains("REFERRAL")) score += 20;
            if (source.contains("WEBSITE") || source.contains("DIGITAL")) score += 10;
            if (source.contains("WALK_IN") || source.contains("BRANCH")) score += 5;
        }
        return Math.min(score, 100);
    }
}
