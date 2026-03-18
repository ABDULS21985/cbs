package com.cbs.salessupport.repository;
import com.cbs.salessupport.entity.SalesCollateral;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface SalesCollateralRepository extends JpaRepository<SalesCollateral, Long> {
    Optional<SalesCollateral> findByCollateralCode(String code);
    List<SalesCollateral> findByProductFamilyAndCollateralTypeAndStatusOrderByTitleAsc(String family, String type, String status);
    List<SalesCollateral> findByProductFamilyAndStatusOrderByTitleAsc(String family, String status);
    List<SalesCollateral> findByCollateralTypeAndStatusOrderByTitleAsc(String type, String status);
    List<SalesCollateral> findByStatusOrderByTitleAsc(String status);
}
