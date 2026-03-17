package com.cbs.customer.repository;

import com.cbs.customer.entity.CustomerIdentification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerIdentificationRepository extends JpaRepository<CustomerIdentification, Long> {

    List<CustomerIdentification> findByCustomerId(Long customerId);

    Optional<CustomerIdentification> findByIdAndCustomerId(Long id, Long customerId);

    Optional<CustomerIdentification> findByCustomerIdAndIdTypeAndIdNumber(Long customerId, String idType, String idNumber);

    Optional<CustomerIdentification> findByIdTypeAndIdNumber(String idType, String idNumber);

    @Modifying
    @Query("UPDATE CustomerIdentification i SET i.isPrimary = false WHERE i.customer.id = :customerId AND i.id <> :idDocId")
    void clearPrimaryFlag(@Param("customerId") Long customerId, @Param("idDocId") Long idDocId);

    @Query("SELECT i FROM CustomerIdentification i WHERE i.customer.id = :customerId AND i.isVerified = true")
    List<CustomerIdentification> findVerifiedByCustomerId(@Param("customerId") Long customerId);
}
