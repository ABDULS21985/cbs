package com.cbs.cashpool.repository;
import com.cbs.cashpool.entity.CashPoolStructure;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CashPoolStructureRepository extends JpaRepository<CashPoolStructure, Long> {
    Optional<CashPoolStructure> findByPoolCode(String code);
    List<CashPoolStructure> findByCustomerIdAndIsActiveTrueOrderByPoolNameAsc(Long customerId);
    List<CashPoolStructure> findByIsActiveTrueOrderByPoolNameAsc();
}
