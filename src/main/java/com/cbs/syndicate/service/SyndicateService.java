package com.cbs.syndicate.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.syndicate.entity.SyndicateArrangement;
import com.cbs.syndicate.repository.SyndicateArrangementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SyndicateService {

    private final SyndicateArrangementRepository syndicateRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public SyndicateArrangement create(SyndicateArrangement syndicate) {
        if (!StringUtils.hasText(syndicate.getSyndicateName())) {
            throw new BusinessException("Syndicate name is required", "MISSING_SYNDICATE_NAME");
        }
        if (syndicate.getTotalFacilityAmount() == null || syndicate.getTotalFacilityAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Total facility amount must be positive", "INVALID_FACILITY_AMOUNT");
        }
        if (syndicate.getOurCommitment() == null || syndicate.getOurCommitment().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Our commitment amount must be positive", "INVALID_COMMITMENT");
        }
        if (syndicate.getOurCommitment().compareTo(syndicate.getTotalFacilityAmount()) > 0) {
            throw new BusinessException("Our commitment cannot exceed total facility amount", "COMMITMENT_EXCEEDS_FACILITY");
        }

        syndicate.setSyndicateCode("SYN-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        syndicate.setStatus("DRAFT");
        if (syndicate.getTotalFacilityAmount().signum() > 0) {
            syndicate.setOurSharePct(syndicate.getOurCommitment()
                    .divide(syndicate.getTotalFacilityAmount(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
        }
        SyndicateArrangement saved = syndicateRepository.save(syndicate);
        log.info("AUDIT: Syndicate created: code={}, type={}, total={}, our_share={}%, actor={}",
                saved.getSyndicateCode(), saved.getSyndicateType(),
                saved.getTotalFacilityAmount(), saved.getOurSharePct(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SyndicateArrangement activate(String code) {
        SyndicateArrangement s = getByCode(code);
        if (!"DRAFT".equals(s.getStatus())) {
            throw new BusinessException("Only DRAFT syndicates can be activated; current status: " + s.getStatus(),
                    "INVALID_SYNDICATE_STATUS");
        }
        // Validate participants are configured before activation
        if (s.getParticipants() == null || s.getParticipants().isEmpty()) {
            throw new BusinessException("At least one participant must be configured before activation", "NO_PARTICIPANTS");
        }
        // Validate total committed covers the facility
        BigDecimal totalCommitted = s.getOurCommitment() != null ? s.getOurCommitment() : BigDecimal.ZERO;
        for (Map<String, Object> p : s.getParticipants()) {
            Object commitObj = p.get("commitment");
            if (commitObj != null) {
                totalCommitted = totalCommitted.add(new BigDecimal(commitObj.toString()));
            }
        }
        if (totalCommitted.compareTo(s.getTotalFacilityAmount()) < 0) {
            throw new BusinessException(
                    String.format("Total committed %s does not cover facility amount %s",
                            totalCommitted, s.getTotalFacilityAmount()),
                    "INSUFFICIENT_COMMITMENT");
        }
        s.setStatus("ACTIVE");
        s.setSigningDate(LocalDate.now());
        SyndicateArrangement saved = syndicateRepository.save(s);
        log.info("AUDIT: Syndicate activated: code={}, participants={}, actor={}",
                code, s.getParticipants().size(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SyndicateArrangement addParticipant(String code, String participantName, BigDecimal commitment) {
        SyndicateArrangement s = getByCode(code);
        if (!"DRAFT".equals(s.getStatus())) {
            throw new BusinessException("Participants can only be added to DRAFT syndicates", "INVALID_SYNDICATE_STATUS");
        }
        if (!StringUtils.hasText(participantName)) {
            throw new BusinessException("Participant name is required", "MISSING_PARTICIPANT_NAME");
        }
        if (commitment == null || commitment.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Commitment amount must be positive", "INVALID_COMMITMENT");
        }

        // Calculate current total commitment
        BigDecimal currentTotal = s.getOurCommitment() != null ? s.getOurCommitment() : BigDecimal.ZERO;
        if (s.getParticipants() != null) {
            for (Map<String, Object> p : s.getParticipants()) {
                Object commitObj = p.get("commitment");
                if (commitObj != null) currentTotal = currentTotal.add(new BigDecimal(commitObj.toString()));
            }
        }
        BigDecimal newTotalCommitted = currentTotal.add(commitment);
        if (newTotalCommitted.compareTo(s.getTotalFacilityAmount()) > 0) {
            throw new BusinessException(
                    String.format("Adding commitment %s would exceed total facility %s (current total: %s)",
                            commitment, s.getTotalFacilityAmount(), currentTotal),
                    "COMMITMENT_EXCEEDS_FACILITY");
        }

        // Add to participants list
        if (s.getParticipants() == null) {
            s.setParticipants(new java.util.ArrayList<>());
        }
        s.getParticipants().add(Map.of(
                "name", participantName,
                "commitment", commitment.toString(),
                "sharePct", commitment.divide(s.getTotalFacilityAmount(), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100")).toString()
        ));
        SyndicateArrangement saved = syndicateRepository.save(s);
        log.info("AUDIT: Participant added to syndicate: code={}, participant={}, commitment={}, totalCommitted={}, actor={}",
                code, participantName, commitment, newTotalCommitted, currentActorProvider.getCurrentActor());
        return saved;
    }

    public SyndicateArrangement getByCode(String code) {
        return syndicateRepository.findBySyndicateCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("SyndicateArrangement", "syndicateCode", code));
    }

    public List<SyndicateArrangement> getByType(String type) {
        return syndicateRepository.findBySyndicateTypeAndStatusOrderBySyndicateNameAsc(type, "ACTIVE");
    }

    public List<SyndicateArrangement> getActive() {
        return syndicateRepository.findByStatusOrderBySyndicateNameAsc("ACTIVE");
    }
}
