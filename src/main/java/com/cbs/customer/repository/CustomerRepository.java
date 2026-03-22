package com.cbs.customer.repository;

import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long>, JpaSpecificationExecutor<Customer> {

    Optional<Customer> findByCifNumber(String cifNumber);

    boolean existsByCifNumber(String cifNumber);

    boolean existsByEmail(String email);

    Optional<Customer> findByEmail(String email);

    boolean existsByPhonePrimary(String phonePrimary);

    Optional<Customer> findByPhonePrimary(String phonePrimary);

    @Query("SELECT c FROM Customer c WHERE c.email = :email AND c.id <> :excludeId")
    Optional<Customer> findByEmailExcludingId(@Param("email") String email, @Param("excludeId") Long excludeId);

    @Query("SELECT c FROM Customer c WHERE c.phonePrimary = :phone AND c.id <> :excludeId")
    Optional<Customer> findByPhonePrimaryExcludingId(@Param("phone") String phone, @Param("excludeId") Long excludeId);

    Page<Customer> findByCustomerType(CustomerType customerType, Pageable pageable);

    Page<Customer> findByStatus(CustomerStatus status, Pageable pageable);

    Page<Customer> findByBranchCode(String branchCode, Pageable pageable);

    Page<Customer> findByRiskRating(RiskRating riskRating, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.status = :status AND c.customerType = :type")
    Page<Customer> findByStatusAndType(@Param("status") CustomerStatus status,
                                        @Param("type") CustomerType type,
                                        Pageable pageable);

    @Query("""
            SELECT c FROM Customer c
            WHERE (:searchTerm IS NULL OR
                   LOWER(c.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR
                   LOWER(c.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR
                   LOWER(c.registeredName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR
                   LOWER(c.tradingName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR
                   c.cifNumber LIKE CONCAT('%', :searchTerm, '%') OR
                   c.email LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR
                   c.phonePrimary LIKE CONCAT('%', :searchTerm, '%'))
            """)
    Page<Customer> searchCustomers(@Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.id = :id")
    Optional<Customer> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT c FROM Customer c WHERE c.cifNumber = :cifNumber")
    Optional<Customer> findByCifNumberWithDetails(@Param("cifNumber") String cifNumber);

    @Query(value = "SELECT nextval('cbs.cif_number_seq')", nativeQuery = true)
    Long getNextCifSequence();

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.status = :status")
    long countByStatus(@Param("status") CustomerStatus status);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.customerType = :type")
    long countByCustomerType(@Param("type") CustomerType type);

    List<Customer> findByRelationshipManager(String relationshipManager);

    // ========================================================================
    // Frontend-facing count & KYC queries
    // ========================================================================

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.createdAt >= :since")
    long countByCreatedAtAfter(@Param("since") Instant since);

    @Query("""
            SELECT DISTINCT c FROM Customer c JOIN c.identifications i
            WHERE i.expiryDate IS NOT NULL AND i.expiryDate < :today
            """)
    Page<Customer> findCustomersWithExpiredIdentifications(@Param("today") LocalDate today, Pageable pageable);

    @Query("""
            SELECT DISTINCT c FROM Customer c JOIN c.identifications i
            WHERE i.isVerified = false
            """)
    Page<Customer> findCustomersWithUnverifiedIdentifications(Pageable pageable);

    @Query("""
            SELECT c FROM Customer c
            WHERE c.status = 'ACTIVE'
            AND NOT EXISTS (
                SELECT i FROM CustomerIdentification i
                WHERE i.customer = c AND i.isVerified = false
            )
            AND EXISTS (
                SELECT i2 FROM CustomerIdentification i2
                WHERE i2.customer = c
            )
            """)
    Page<Customer> findCustomersWithAllVerifiedIdentifications(Pageable pageable);

    @Query("""
            SELECT COUNT(DISTINCT c) FROM Customer c
            WHERE c.status = 'ACTIVE'
            AND NOT EXISTS (
                SELECT i FROM CustomerIdentification i
                WHERE i.customer = c AND i.isVerified = false
            )
            AND EXISTS (
                SELECT i2 FROM CustomerIdentification i2
                WHERE i2.customer = c
            )
            """)
    long countCustomersFullyVerified();

    @Query("""
            SELECT COUNT(DISTINCT c) FROM Customer c JOIN c.identifications i
            WHERE i.expiryDate IS NOT NULL AND i.expiryDate < :today
            """)
    long countCustomersWithExpiredIds(@Param("today") LocalDate today);
}
