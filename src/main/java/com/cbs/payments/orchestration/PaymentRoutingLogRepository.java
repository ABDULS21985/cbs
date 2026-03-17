package com.cbs.payments.orchestration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PaymentRoutingLogRepository extends JpaRepository<PaymentRoutingLog, Long> {
    List<PaymentRoutingLog> findByPaymentRef(String paymentRef);
}
