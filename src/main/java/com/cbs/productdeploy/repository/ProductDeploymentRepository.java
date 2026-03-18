package com.cbs.productdeploy.repository;
import com.cbs.productdeploy.entity.ProductDeployment; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface ProductDeploymentRepository extends JpaRepository<ProductDeployment, Long> {
    Optional<ProductDeployment> findByDeploymentCode(String code);
    List<ProductDeployment> findByProductCodeOrderByPlannedDateDesc(String productCode);
    List<ProductDeployment> findByStatusOrderByPlannedDateAsc(String status);
}
