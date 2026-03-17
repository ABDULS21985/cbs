package com.cbs.notionalpool.repository;
import com.cbs.notionalpool.entity.NotionalPool;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface NotionalPoolRepository extends JpaRepository<NotionalPool, Long> {
    Optional<NotionalPool> findByPoolCode(String code);
    List<NotionalPool> findByCustomerIdAndIsActiveTrueOrderByPoolNameAsc(Long customerId);
}
