package com.cbs.fingateway.repository;
import com.cbs.fingateway.entity.FinancialGateway;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface FinancialGatewayRepository extends JpaRepository<FinancialGateway, Long> {
    Optional<FinancialGateway> findByGatewayCode(String code);
    List<FinancialGateway> findByGatewayTypeAndIsActiveTrueOrderByGatewayNameAsc(String type);
    List<FinancialGateway> findByConnectionStatusOrderByGatewayNameAsc(String status);
}
