package com.cbs.interbankrel.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.interbankrel.entity.InterbankRelationship;
import com.cbs.interbankrel.repository.InterbankRelationshipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class InterbankRelationshipService {

    /** SWIFT BIC format: 8 or 11 alphanumeric characters. */
    private static final Pattern BIC_PATTERN = Pattern.compile("^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$");

    private static final List<String> VALID_RELATIONSHIP_TYPES = List.of(
            "CORRESPONDENT", "NOSTRO", "VOSTRO", "SETTLEMENT_AGENT", "CLEARING_MEMBER",
            "CUSTODIAN", "LIQUIDITY_PROVIDER", "FX_COUNTERPARTY");

    private final InterbankRelationshipRepository relationshipRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public InterbankRelationship create(InterbankRelationship rel) {
        // Validation
        if (!StringUtils.hasText(rel.getBankName())) {
            throw new BusinessException("Bank name is required", "MISSING_BANK_NAME");
        }
        if (!StringUtils.hasText(rel.getRelationshipType())) {
            throw new BusinessException("Relationship type is required", "MISSING_RELATIONSHIP_TYPE");
        }
        if (!VALID_RELATIONSHIP_TYPES.contains(rel.getRelationshipType())) {
            throw new BusinessException(
                    "Invalid relationship type: " + rel.getRelationshipType() + ". Valid types: " + VALID_RELATIONSHIP_TYPES,
                    "INVALID_RELATIONSHIP_TYPE");
        }
        if (StringUtils.hasText(rel.getBicCode())) {
            String bic = rel.getBicCode().toUpperCase().trim();
            if (!BIC_PATTERN.matcher(bic).matches()) {
                throw new BusinessException(
                        "Invalid BIC format: " + rel.getBicCode() + ". Must be 8 or 11 alphanumeric characters (SWIFT format)",
                        "INVALID_BIC_FORMAT");
            }
            rel.setBicCode(bic);

            // Duplicate BIC check
            List<InterbankRelationship> existingWithBic = relationshipRepository.findByStatusOrderByBankNameAsc("ACTIVE");
            boolean bicExists = existingWithBic.stream()
                    .anyMatch(r -> bic.equals(r.getBicCode()));
            if (bicExists) {
                throw new BusinessException(
                        "An active relationship with BIC " + bic + " already exists",
                        "DUPLICATE_BIC");
            }
        }

        // Credit line defaults
        if (rel.getCreditLineUsed() == null) {
            rel.setCreditLineUsed(BigDecimal.ZERO);
        }
        if (rel.getAgreementDate() == null) {
            rel.setAgreementDate(LocalDate.now());
        }

        rel.setRelationshipCode("IBR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        rel.setStatus("ACTIVE");

        InterbankRelationship saved = relationshipRepository.save(rel);
        log.info("Interbank relationship created: code={}, bank={}, bic={}, type={}, actor={}",
                saved.getRelationshipCode(), saved.getBankName(), saved.getBicCode(),
                saved.getRelationshipType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @Transactional
    public InterbankRelationship update(String relationshipCode, InterbankRelationship updates) {
        InterbankRelationship rel = getByCode(relationshipCode);
        if ("TERMINATED".equals(rel.getStatus())) {
            throw new BusinessException("Cannot update a TERMINATED relationship", "RELATIONSHIP_TERMINATED");
        }

        if (updates.getBankName() != null) rel.setBankName(updates.getBankName());
        if (updates.getBicCode() != null) {
            String bic = updates.getBicCode().toUpperCase().trim();
            if (!BIC_PATTERN.matcher(bic).matches()) {
                throw new BusinessException("Invalid BIC format: " + bic, "INVALID_BIC_FORMAT");
            }
            rel.setBicCode(bic);
        }
        if (updates.getCreditLineAmount() != null) rel.setCreditLineAmount(updates.getCreditLineAmount());
        if (updates.getReviewDate() != null) rel.setReviewDate(updates.getReviewDate());
        if (updates.getCounterpartyBankId() != null) rel.setCounterpartyBankId(updates.getCounterpartyBankId());

        InterbankRelationship saved = relationshipRepository.save(rel);
        log.info("Interbank relationship updated: code={}, actor={}",
                relationshipCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Status Management ───────────────────────────────────────────────────

    @Transactional
    public InterbankRelationship deactivate(String relationshipCode) {
        InterbankRelationship rel = getByCode(relationshipCode);
        if (!"ACTIVE".equals(rel.getStatus())) {
            throw new BusinessException(
                    "Only ACTIVE relationships can be deactivated; current status: " + rel.getStatus(),
                    "INVALID_RELATIONSHIP_STATUS");
        }
        rel.setStatus("SUSPENDED");
        InterbankRelationship saved = relationshipRepository.save(rel);
        log.info("Interbank relationship suspended: code={}, actor={}",
                relationshipCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public InterbankRelationship reactivate(String relationshipCode) {
        InterbankRelationship rel = getByCode(relationshipCode);
        if (!"SUSPENDED".equals(rel.getStatus())) {
            throw new BusinessException(
                    "Only SUSPENDED relationships can be reactivated; current status: " + rel.getStatus(),
                    "INVALID_RELATIONSHIP_STATUS");
        }
        rel.setStatus("ACTIVE");
        InterbankRelationship saved = relationshipRepository.save(rel);
        log.info("Interbank relationship reactivated: code={}, actor={}",
                relationshipCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public InterbankRelationship terminate(String relationshipCode) {
        InterbankRelationship rel = getByCode(relationshipCode);
        if ("TERMINATED".equals(rel.getStatus())) {
            throw new BusinessException("Relationship is already terminated", "ALREADY_TERMINATED");
        }
        // Ensure no outstanding credit usage
        if (rel.getCreditLineUsed() != null && rel.getCreditLineUsed().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException(
                    String.format("Cannot terminate relationship with outstanding credit usage: %s",
                            rel.getCreditLineUsed()),
                    "OUTSTANDING_CREDIT_USAGE");
        }
        rel.setStatus("TERMINATED");
        InterbankRelationship saved = relationshipRepository.save(rel);
        log.info("Interbank relationship terminated: code={}, actor={}",
                relationshipCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Credit Limit Tracking ───────────────────────────────────────────────

    @Transactional
    public InterbankRelationship utilizeCreditLine(String relationshipCode, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Utilization amount must be greater than zero", "INVALID_AMOUNT");
        }
        InterbankRelationship rel = getByCode(relationshipCode);
        if (!"ACTIVE".equals(rel.getStatus())) {
            throw new BusinessException("Credit line can only be used on ACTIVE relationships", "RELATIONSHIP_NOT_ACTIVE");
        }
        if (rel.getCreditLineAmount() == null) {
            throw new BusinessException("No credit line established for this relationship", "NO_CREDIT_LINE");
        }
        BigDecimal newUsed = rel.getCreditLineUsed().add(amount);
        if (newUsed.compareTo(rel.getCreditLineAmount()) > 0) {
            throw new BusinessException(
                    String.format("Credit line breach: limit=%s, currentUsed=%s, requested=%s",
                            rel.getCreditLineAmount(), rel.getCreditLineUsed(), amount),
                    "CREDIT_LINE_EXCEEDED");
        }
        rel.setCreditLineUsed(newUsed);
        InterbankRelationship saved = relationshipRepository.save(rel);
        log.info("Credit line utilized: code={}, amount={}, used={}/{}, actor={}",
                relationshipCode, amount, newUsed, rel.getCreditLineAmount(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public InterbankRelationship releaseCreditLine(String relationshipCode, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Release amount must be greater than zero", "INVALID_AMOUNT");
        }
        InterbankRelationship rel = getByCode(relationshipCode);
        BigDecimal newUsed = rel.getCreditLineUsed().subtract(amount);
        if (newUsed.compareTo(BigDecimal.ZERO) < 0) {
            newUsed = BigDecimal.ZERO;
        }
        rel.setCreditLineUsed(newUsed);
        InterbankRelationship saved = relationshipRepository.save(rel);
        log.info("Credit line released: code={}, amount={}, usedAfter={}, actor={}",
                relationshipCode, amount, newUsed, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Expiry Management ───────────────────────────────────────────────────

    public List<InterbankRelationship> getExpiringSoon(int withinDays) {
        LocalDate cutoff = LocalDate.now().plusDays(withinDays);
        List<InterbankRelationship> active = relationshipRepository.findByStatusOrderByBankNameAsc("ACTIVE");
        return active.stream()
                .filter(r -> r.getReviewDate() != null && !r.getReviewDate().isAfter(cutoff))
                .toList();
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public InterbankRelationship getByCode(String code) {
        return relationshipRepository.findByRelationshipCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("InterbankRelationship", "relationshipCode", code));
    }

    public List<InterbankRelationship> getByType(String type) {
        return relationshipRepository.findByRelationshipTypeAndStatusOrderByBankNameAsc(type, "ACTIVE");
    }

    public List<InterbankRelationship> getAll() {
        return relationshipRepository.findByStatusOrderByBankNameAsc("ACTIVE");
    }
}
