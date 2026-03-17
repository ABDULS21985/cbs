package com.cbs.customer.repository;

import com.cbs.customer.entity.AddressType;
import com.cbs.customer.entity.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {

    List<CustomerAddress> findByCustomerId(Long customerId);

    Optional<CustomerAddress> findByIdAndCustomerId(Long id, Long customerId);

    Optional<CustomerAddress> findByCustomerIdAndIsPrimaryTrue(Long customerId);

    List<CustomerAddress> findByCustomerIdAndAddressType(Long customerId, AddressType addressType);

    @Modifying
    @Query("UPDATE CustomerAddress a SET a.isPrimary = false WHERE a.customer.id = :customerId AND a.id <> :addressId")
    void clearPrimaryFlag(@Param("customerId") Long customerId, @Param("addressId") Long addressId);
}
