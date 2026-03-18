package com.cbs.brand.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.brand.entity.BrandGuideline;
import com.cbs.brand.repository.BrandGuidelineRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BrandService {
    private final BrandGuidelineRepository repository;
    @Transactional
    public BrandGuideline create(BrandGuideline bg) {
        bg.setGuidelineCode("BG-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        bg.setApprovalStatus("DRAFT");
        return repository.save(bg);
    }
    @Transactional
    public BrandGuideline activate(String code) {
        BrandGuideline bg = getByCode(code);
        bg.setApprovalStatus("ACTIVE");
        return repository.save(bg);
    }
    public List<BrandGuideline> getByType(String type) { return repository.findByGuidelineTypeAndApprovalStatusOrderByGuidelineNameAsc(type, "ACTIVE"); }
    public List<BrandGuideline> getActive() { return repository.findByApprovalStatusOrderByGuidelineNameAsc("ACTIVE"); }
    public BrandGuideline getByCode(String code) {
        return repository.findByGuidelineCode(code).orElseThrow(() -> new ResourceNotFoundException("BrandGuideline", "guidelineCode", code));
    }
}
