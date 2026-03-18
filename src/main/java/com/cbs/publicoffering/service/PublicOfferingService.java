package com.cbs.publicoffering.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.publicoffering.entity.PublicOfferingDetail;
import com.cbs.publicoffering.repository.PublicOfferingDetailRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate; import java.util.List;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class PublicOfferingService {
    private final PublicOfferingDetailRepository repository;

    @Transactional public PublicOfferingDetail createOffering(Long dealId, PublicOfferingDetail detail) {
        detail.setDealId(dealId);
        detail.setStatus("PLANNING");
        return repository.save(detail);
    }

    @Transactional public PublicOfferingDetail submitToRegulator(Long id) {
        PublicOfferingDetail d = getById(id);
        d.setProspectusSubmittedDate(LocalDate.now());
        d.setStatus("SEC_REVIEW");
        return repository.save(d);
    }

    @Transactional public PublicOfferingDetail openApplications(Long id) {
        PublicOfferingDetail d = getById(id);
        d.setApplicationOpenDate(LocalDate.now());
        d.setStatus("OPEN");
        return repository.save(d);
    }

    @Transactional public PublicOfferingDetail closeApplications(Long id) {
        PublicOfferingDetail d = getById(id);
        if (d.getApplicationCloseDate() != null && LocalDate.now().isAfter(d.getApplicationCloseDate())) {
            throw new IllegalStateException("Applications already closed on " + d.getApplicationCloseDate());
        }
        d.setApplicationCloseDate(LocalDate.now());
        d.setStatus("CLOSED");
        return repository.save(d);
    }

    @Transactional public PublicOfferingDetail recordAllotment(Long id, String basisOfAllotment) {
        PublicOfferingDetail d = getById(id);
        d.setBasisOfAllotment(basisOfAllotment);
        d.setStatus("ALLOTTED");
        return repository.save(d);
    }

    public PublicOfferingDetail getOfferingStatus(Long id) { return getById(id); }

    public PublicOfferingDetail getByDealId(Long dealId) { return repository.findByDealId(dealId).orElseThrow(() -> new ResourceNotFoundException("PublicOfferingDetail", "dealId", dealId)); }

    public List<PublicOfferingDetail> getPipelineReport() { return repository.findByStatusInOrderByApplicationOpenDateDesc(List.of("PLANNING", "SEC_REVIEW", "APPROVED", "OPEN")); }

    private PublicOfferingDetail getById(Long id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("PublicOfferingDetail", "id", id)); }
}
