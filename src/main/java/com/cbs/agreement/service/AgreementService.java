package com.cbs.agreement.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.agreement.entity.CustomerAgreement; import com.cbs.agreement.repository.CustomerAgreementRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*; import java.time.LocalDate;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AgreementService {
    private final CustomerAgreementRepository agreementRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public CustomerAgreement create(CustomerAgreement agreement) {
        // Required field validation
        if (agreement.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required", "MISSING_CUSTOMER_ID");
        }
        if (agreement.getAgreementType() == null || agreement.getAgreementType().isBlank()) {
            throw new BusinessException("Agreement type is required", "MISSING_AGREEMENT_TYPE");
        }
        if (agreement.getTitle() == null || agreement.getTitle().isBlank()) {
            throw new BusinessException("Agreement title is required", "MISSING_TITLE");
        }
        agreement.setAgreementNumber("AGR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        agreement.setStatus("DRAFT");
        CustomerAgreement saved = agreementRepository.save(agreement);
        log.info("AUDIT: Agreement created: number={}, customer={}, type={}, actor={}",
                saved.getAgreementNumber(), saved.getCustomerId(), saved.getAgreementType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CustomerAgreement activate(String number) {
        CustomerAgreement a = agreementRepository.findByAgreementNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerAgreement", "agreementNumber", number));
        if (!"DRAFT".equals(a.getStatus())) {
            throw new BusinessException("Agreement " + number + " must be DRAFT to activate; current: " + a.getStatus(), "INVALID_STATUS");
        }
        a.setStatus("ACTIVE");
        // Use actual actor identities instead of hardcoded names
        String actor = currentActorProvider.getCurrentActor();
        a.setSignedByCustomer("Customer:" + a.getCustomerId());
        a.setSignedByBank("Bank:" + actor);
        a.setSignedDate(LocalDate.now());
        a.setUpdatedAt(Instant.now());
        CustomerAgreement saved = agreementRepository.save(a);
        log.info("AUDIT: Agreement activated: number={}, customer={}, signedBy={}, actor={}",
                number, a.getCustomerId(), actor, actor);
        return saved;
    }

    @Transactional
    public CustomerAgreement terminate(String number, String reason) {
        CustomerAgreement a = agreementRepository.findByAgreementNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerAgreement", "agreementNumber", number));
        if ("TERMINATED".equals(a.getStatus())) {
            throw new BusinessException("Agreement " + number + " is already TERMINATED", "ALREADY_TERMINATED");
        }
        a.setStatus("TERMINATED");
        if (reason != null && !reason.isBlank()) a.setTerminationReason(reason);
        a.setUpdatedAt(Instant.now());
        CustomerAgreement saved = agreementRepository.save(a);
        log.info("AUDIT: Agreement terminated: number={}, customer={}, reason={}, actor={}",
                number, a.getCustomerId(), reason, currentActorProvider.getCurrentActor());
        // Customer notification would be triggered here via event/messaging
        return saved;
    }

    public List<CustomerAgreement> getByCustomer(Long customerId) { return agreementRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<CustomerAgreement> getAll() { return agreementRepository.findAll(); }
    public CustomerAgreement getById(Long id) {
        return agreementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerAgreement", "id", id));
    }

    @Transactional
    public CustomerAgreement update(Long id, CustomerAgreement patch) {
        CustomerAgreement a = getById(id);
        if (!"DRAFT".equals(a.getStatus())) throw new BusinessException("Only DRAFT agreements can be updated");
        if (patch.getTitle() != null) a.setTitle(patch.getTitle());
        if (patch.getDescription() != null) a.setDescription(patch.getDescription());
        if (patch.getAgreementType() != null) a.setAgreementType(patch.getAgreementType());
        if (patch.getDocumentRef() != null) a.setDocumentRef(patch.getDocumentRef());
        if (patch.getEffectiveFrom() != null) a.setEffectiveFrom(patch.getEffectiveFrom());
        if (patch.getEffectiveTo() != null) a.setEffectiveTo(patch.getEffectiveTo());
        if (patch.getAutoRenew() != null) a.setAutoRenew(patch.getAutoRenew());
        if (patch.getRenewalTermMonths() != null) a.setRenewalTermMonths(patch.getRenewalTermMonths());
        if (patch.getNoticePeriodDays() != null) a.setNoticePeriodDays(patch.getNoticePeriodDays());
        a.setUpdatedAt(Instant.now());
        CustomerAgreement saved = agreementRepository.save(a);
        log.info("AUDIT: Agreement updated: number={}, actor={}", a.getAgreementNumber(), currentActorProvider.getCurrentActor());
        return saved;
    }
}
