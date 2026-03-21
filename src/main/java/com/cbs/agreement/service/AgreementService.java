package com.cbs.agreement.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.agreement.entity.CustomerAgreement; import com.cbs.agreement.repository.CustomerAgreementRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*; import java.time.LocalDate;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AgreementService {
    private final CustomerAgreementRepository agreementRepository;
    @Transactional
    public CustomerAgreement create(CustomerAgreement agreement) {
        agreement.setAgreementNumber("AGR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        agreement.setStatus("DRAFT");
        return agreementRepository.save(agreement);
    }
    @Transactional
    public CustomerAgreement activate(String number) {
        CustomerAgreement a = agreementRepository.findByAgreementNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerAgreement", "agreementNumber", number));
        a.setStatus("ACTIVE"); a.setSignedByCustomer("CUSTOMER"); a.setSignedByBank("BANK");
        a.setSignedDate(LocalDate.now()); a.setUpdatedAt(Instant.now());
        return agreementRepository.save(a);
    }
    @Transactional
    public CustomerAgreement terminate(String number) {
        CustomerAgreement a = agreementRepository.findByAgreementNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerAgreement", "agreementNumber", number));
        a.setStatus("TERMINATED"); a.setUpdatedAt(Instant.now());
        return agreementRepository.save(a);
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
        if (!"DRAFT".equals(a.getStatus())) throw new com.cbs.common.exception.BusinessException("Only DRAFT agreements can be updated");
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
        return agreementRepository.save(a);
    }
}
