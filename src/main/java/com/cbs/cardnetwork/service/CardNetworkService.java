package com.cbs.cardnetwork.service;

import com.cbs.cardnetwork.entity.CardNetworkMembership;
import com.cbs.cardnetwork.repository.CardNetworkMembershipRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CardNetworkService {

    private final CardNetworkMembershipRepository membershipRepository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_NETWORKS = Set.of(
            "VISA", "MASTERCARD", "AMEX", "DISCOVER", "UNIONPAY", "JCB", "MADA"
    );

    private static final Set<String> VALID_MEMBERSHIP_TYPES = Set.of(
            "PRINCIPAL", "ASSOCIATE", "AFFILIATE", "PARTICIPANT"
    );

    private static final Map<String, Set<String>> VALID_STATUS_TRANSITIONS = Map.of(
            "ACTIVE", Set.of("SUSPENDED", "TERMINATED"),
            "SUSPENDED", Set.of("ACTIVE", "TERMINATED"),
            "PENDING", Set.of("ACTIVE", "TERMINATED")
    );

    @Transactional
    public CardNetworkMembership register(CardNetworkMembership membership) {
        validateMembership(membership);

        // Duplicate check: same network + memberId
        List<CardNetworkMembership> existing = membershipRepository
                .findByNetworkAndStatusOrderByInstitutionNameAsc(membership.getNetwork(), "ACTIVE");
        for (CardNetworkMembership m : existing) {
            if (m.getMemberId().equals(membership.getMemberId())) {
                throw new BusinessException("Active membership already exists for network="
                        + membership.getNetwork() + " memberId=" + membership.getMemberId());
            }
        }

        if (membership.getStatus() == null) {
            membership.setStatus("ACTIVE");
        }
        if (membership.getEffectiveFrom() == null) {
            membership.setEffectiveFrom(LocalDate.now());
        }
        membership.setCreatedAt(Instant.now());

        CardNetworkMembership saved = membershipRepository.save(membership);
        log.info("Card network membership registered by {}: network={}, type={}, member={}, institution={}",
                actorProvider.getCurrentActor(), saved.getNetwork(), saved.getMembershipType(),
                saved.getMemberId(), saved.getInstitutionName());
        return saved;
    }

    /**
     * Activates a suspended or pending membership.
     */
    @Transactional
    public CardNetworkMembership activate(Long membershipId) {
        CardNetworkMembership m = getMembershipById(membershipId);
        guardStatusTransition(m, "ACTIVE");

        // Compliance check before activation
        verifyComplianceForActivation(m);

        m.setStatus("ACTIVE");
        log.info("Membership activated by {}: id={}, network={}, member={}",
                actorProvider.getCurrentActor(), membershipId, m.getNetwork(), m.getMemberId());
        return membershipRepository.save(m);
    }

    /**
     * Suspends an active membership.
     */
    @Transactional
    public CardNetworkMembership suspend(Long membershipId, String reason) {
        CardNetworkMembership m = getMembershipById(membershipId);
        guardStatusTransition(m, "SUSPENDED");

        m.setStatus("SUSPENDED");
        m.setIssuingEnabled(false);
        m.setAcquiringEnabled(false);

        log.warn("Membership suspended by {}: id={}, network={}, member={}, reason={}",
                actorProvider.getCurrentActor(), membershipId, m.getNetwork(), m.getMemberId(), reason);
        return membershipRepository.save(m);
    }

    /**
     * Terminates a membership permanently.
     */
    @Transactional
    public CardNetworkMembership terminate(Long membershipId) {
        CardNetworkMembership m = getMembershipById(membershipId);
        if ("TERMINATED".equals(m.getStatus())) {
            throw new BusinessException("Membership is already terminated");
        }
        Set<String> allowed = VALID_STATUS_TRANSITIONS.getOrDefault(m.getStatus(), Set.of());
        if (!allowed.contains("TERMINATED")) {
            throw new BusinessException("Cannot terminate membership in status: " + m.getStatus());
        }

        m.setStatus("TERMINATED");
        m.setEffectiveTo(LocalDate.now());
        m.setIssuingEnabled(false);
        m.setAcquiringEnabled(false);

        log.info("Membership terminated by {}: id={}, network={}, member={}",
                actorProvider.getCurrentActor(), membershipId, m.getNetwork(), m.getMemberId());
        return membershipRepository.save(m);
    }

    /**
     * Updates BIN ranges for a membership. Validates that BIN ranges don't overlap
     * with other memberships in the same network.
     */
    @Transactional
    public CardNetworkMembership updateBinRanges(Long membershipId, List<Map<String, Object>> binRanges) {
        CardNetworkMembership m = getMembershipById(membershipId);
        if (!"ACTIVE".equals(m.getStatus())) {
            throw new BusinessException("BIN ranges can only be updated for ACTIVE memberships");
        }
        if (binRanges == null || binRanges.isEmpty()) {
            throw new BusinessException("At least one BIN range is required");
        }

        // Validate each BIN range
        for (Map<String, Object> binRange : binRanges) {
            String rangeStart = (String) binRange.get("rangeStart");
            String rangeEnd = (String) binRange.get("rangeEnd");
            if (rangeStart == null || rangeEnd == null) {
                throw new BusinessException("BIN range must have rangeStart and rangeEnd");
            }
            if (rangeStart.length() < 6 || rangeStart.length() > 8) {
                throw new BusinessException("BIN range start must be 6-8 digits");
            }
            if (rangeEnd.length() < 6 || rangeEnd.length() > 8) {
                throw new BusinessException("BIN range end must be 6-8 digits");
            }
            if (rangeStart.compareTo(rangeEnd) > 0) {
                throw new BusinessException("BIN range start must be <= end");
            }
        }

        // Check for overlaps with other memberships in the same network
        List<CardNetworkMembership> networkMembers = membershipRepository
                .findByNetworkAndStatusOrderByInstitutionNameAsc(m.getNetwork(), "ACTIVE");
        for (CardNetworkMembership other : networkMembers) {
            if (other.getId().equals(m.getId())) continue;
            if (other.getBinRanges() == null) continue;
            for (Map<String, Object> otherBin : other.getBinRanges()) {
                String otherStart = (String) otherBin.get("rangeStart");
                String otherEnd = (String) otherBin.get("rangeEnd");
                if (otherStart == null || otherEnd == null) continue;
                for (Map<String, Object> newBin : binRanges) {
                    String newStart = (String) newBin.get("rangeStart");
                    String newEnd = (String) newBin.get("rangeEnd");
                    if (newStart.compareTo(otherEnd) <= 0 && newEnd.compareTo(otherStart) >= 0) {
                        throw new BusinessException("BIN range " + newStart + "-" + newEnd
                                + " overlaps with member " + other.getMemberId()
                                + " range " + otherStart + "-" + otherEnd);
                    }
                }
            }
        }

        m.setBinRanges(binRanges);
        log.info("BIN ranges updated by {}: membershipId={}, rangeCount={}",
                actorProvider.getCurrentActor(), membershipId, binRanges.size());
        return membershipRepository.save(m);
    }

    /**
     * Verifies compliance status for all active memberships and flags any
     * with expired PCI DSS certifications.
     */
    public List<Map<String, Object>> verifyCompliance() {
        List<CardNetworkMembership> active = membershipRepository.findByStatusOrderByNetworkAscInstitutionNameAsc("ACTIVE");
        List<Map<String, Object>> issues = new ArrayList<>();

        for (CardNetworkMembership m : active) {
            List<String> complianceIssues = new ArrayList<>();

            if (!Boolean.TRUE.equals(m.getPciDssCompliant())) {
                complianceIssues.add("PCI DSS not compliant");
            }
            if (m.getPciExpiryDate() != null && m.getPciExpiryDate().isBefore(LocalDate.now())) {
                complianceIssues.add("PCI DSS certification expired on " + m.getPciExpiryDate());
            }
            if (m.getPciExpiryDate() != null && m.getPciExpiryDate().isBefore(LocalDate.now().plusDays(30))) {
                complianceIssues.add("PCI DSS certification expiring within 30 days");
            }
            if (m.getSettlementBic() == null || m.getSettlementBic().isBlank()) {
                complianceIssues.add("Settlement BIC not configured");
            }

            if (!complianceIssues.isEmpty()) {
                Map<String, Object> issue = new LinkedHashMap<>();
                issue.put("membershipId", m.getId());
                issue.put("network", m.getNetwork());
                issue.put("memberId", m.getMemberId());
                issue.put("institutionName", m.getInstitutionName());
                issue.put("issues", complianceIssues);
                issues.add(issue);
            }
        }

        log.info("Compliance verification by {}: {} memberships with issues out of {} active",
                actorProvider.getCurrentActor(), issues.size(), active.size());
        return issues;
    }

    public List<CardNetworkMembership> getByNetwork(String network) {
        return membershipRepository.findByNetworkAndStatusOrderByInstitutionNameAsc(network, "ACTIVE");
    }

    public List<CardNetworkMembership> getAllActive() {
        return membershipRepository.findByStatusOrderByNetworkAscInstitutionNameAsc("ACTIVE");
    }

    // ---- private helpers ----

    private CardNetworkMembership getMembershipById(Long id) {
        return membershipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CardNetworkMembership", "id", id));
    }

    private void validateMembership(CardNetworkMembership membership) {
        if (membership.getNetwork() == null || membership.getNetwork().isBlank()) {
            throw new BusinessException("Network is required");
        }
        if (!VALID_NETWORKS.contains(membership.getNetwork().toUpperCase())) {
            throw new BusinessException("Invalid network: " + membership.getNetwork() + ". Valid: " + VALID_NETWORKS);
        }
        if (membership.getMemberId() == null || membership.getMemberId().isBlank()) {
            throw new BusinessException("Member ID is required");
        }
        if (membership.getMembershipType() == null || membership.getMembershipType().isBlank()) {
            throw new BusinessException("Membership type is required");
        }
        if (!VALID_MEMBERSHIP_TYPES.contains(membership.getMembershipType().toUpperCase())) {
            throw new BusinessException("Invalid membership type: " + membership.getMembershipType()
                    + ". Valid: " + VALID_MEMBERSHIP_TYPES);
        }
        if (membership.getInstitutionName() == null || membership.getInstitutionName().isBlank()) {
            throw new BusinessException("Institution name is required");
        }
        if (membership.getSettlementCurrency() == null || membership.getSettlementCurrency().length() != 3) {
            throw new BusinessException("Settlement currency must be a 3-letter ISO code");
        }
    }

    private void guardStatusTransition(CardNetworkMembership m, String targetStatus) {
        Set<String> allowed = VALID_STATUS_TRANSITIONS.getOrDefault(m.getStatus(), Set.of());
        if (!allowed.contains(targetStatus)) {
            throw new BusinessException("Invalid status transition from " + m.getStatus() + " to " + targetStatus
                    + ". Allowed: " + allowed);
        }
    }

    private void verifyComplianceForActivation(CardNetworkMembership m) {
        if (!Boolean.TRUE.equals(m.getPciDssCompliant())) {
            throw new BusinessException("Cannot activate membership: PCI DSS compliance required");
        }
        if (m.getPciExpiryDate() != null && m.getPciExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessException("Cannot activate membership: PCI DSS certification has expired");
        }
    }
}
