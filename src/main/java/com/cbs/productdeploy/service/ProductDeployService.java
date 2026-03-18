package com.cbs.productdeploy.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productdeploy.entity.ProductDeployment;
import com.cbs.productdeploy.repository.ProductDeploymentRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ProductDeployService {
    private final ProductDeploymentRepository repository;
    @Transactional public ProductDeployment create(ProductDeployment d) { d.setDeploymentCode("PD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); d.setStatus("PLANNED"); return repository.save(d); }
    @Transactional public ProductDeployment approve(String code) { ProductDeployment d = getByCode(code); d.setStatus("APPROVED"); return repository.save(d); }
    @Transactional public ProductDeployment complete(String code) { ProductDeployment d = getByCode(code); d.setActualDate(LocalDate.now()); d.setStatus("COMPLETED"); return repository.save(d); }
    @Transactional public ProductDeployment rollback(String code) { ProductDeployment d = getByCode(code); d.setStatus("ROLLED_BACK"); return repository.save(d); }
    public List<ProductDeployment> getByProduct(String productCode) { return repository.findByProductCodeOrderByPlannedDateDesc(productCode); }
    public List<ProductDeployment> getInProgress() { return repository.findByStatusOrderByPlannedDateAsc("IN_PROGRESS"); }
    public ProductDeployment getByCode(String code) { return repository.findByDeploymentCode(code).orElseThrow(() -> new ResourceNotFoundException("ProductDeployment", "deploymentCode", code)); }
}
