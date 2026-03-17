package com.cbs.fixedincome.repository;

import com.cbs.fixedincome.entity.CouponPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface CouponPaymentRepository extends JpaRepository<CouponPayment, Long> {
    List<CouponPayment> findByHoldingIdOrderByCouponDateAsc(Long holdingId);
    List<CouponPayment> findByCouponDateAndStatus(LocalDate date, String status);
}
