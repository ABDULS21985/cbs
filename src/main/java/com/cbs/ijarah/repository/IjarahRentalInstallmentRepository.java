package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IjarahRentalInstallmentRepository extends JpaRepository<IjarahRentalInstallment, Long> {

    List<IjarahRentalInstallment> findByContractIdOrderByInstallmentNumberAsc(Long contractId);

    Optional<IjarahRentalInstallment> findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            List<IjarahDomainEnums.RentalInstallmentStatus> statuses);

    List<IjarahRentalInstallment> findByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            List<IjarahDomainEnums.RentalInstallmentStatus> statuses);

    List<IjarahRentalInstallment> findByStatusInAndDueDateBefore(
            List<IjarahDomainEnums.RentalInstallmentStatus> statuses,
            LocalDate dueDate);

    /** Find installments paid within a date range */
    List<IjarahRentalInstallment> findByPaidDateBetween(LocalDate fromDate, LocalDate toDate);

    /** Find installments for a specific contract paid within a date range */
    List<IjarahRentalInstallment> findByContractIdAndPaidDateBetween(Long contractId, LocalDate fromDate, LocalDate toDate);
}
