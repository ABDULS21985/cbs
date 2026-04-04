package com.cbs.murabaha.repository;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MurabahaInstallmentRepository extends JpaRepository<MurabahaInstallment, Long> {

    List<MurabahaInstallment> findByContractIdOrderByInstallmentNumberAsc(Long contractId);

    Optional<MurabahaInstallment> findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            Collection<MurabahaDomainEnums.InstallmentStatus> statuses
    );

    List<MurabahaInstallment> findByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            Collection<MurabahaDomainEnums.InstallmentStatus> statuses
    );

    List<MurabahaInstallment> findByStatusInAndDueDateBefore(Collection<MurabahaDomainEnums.InstallmentStatus> statuses,
                                                             LocalDate dueDate);

    boolean existsByContractId(Long contractId);
}
