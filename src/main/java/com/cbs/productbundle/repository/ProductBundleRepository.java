package com.cbs.productbundle.repository;
import com.cbs.productbundle.entity.ProductBundle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface ProductBundleRepository extends JpaRepository<ProductBundle, Long> {
    Optional<ProductBundle> findByBundleCode(String code);
    List<ProductBundle> findByStatusOrderByBundleNameAsc(String status);
}
