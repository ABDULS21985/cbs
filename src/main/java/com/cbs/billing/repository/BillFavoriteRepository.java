package com.cbs.billing.repository;

import com.cbs.billing.entity.BillFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillFavoriteRepository extends JpaRepository<BillFavorite, Long> {

    List<BillFavorite> findByCustomerIdOrderByLastPaidAtDesc(Long customerId);

    Optional<BillFavorite> findByCustomerIdAndBillerIdAndBillerCustomerId(
            Long customerId, Long billerId, String billerCustomerId);

    Optional<BillFavorite> findByIdAndCustomerId(Long id, Long customerId);

    long countByCustomerId(Long customerId);
}
