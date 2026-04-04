package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahUnitTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MusharakahUnitTransferRepository extends JpaRepository<MusharakahUnitTransfer, Long> {

    List<MusharakahUnitTransfer> findByContractIdOrderByTransferNumberAsc(Long contractId);

    Optional<MusharakahUnitTransfer> findFirstByContractIdOrderByTransferNumberDesc(Long contractId);

    List<MusharakahUnitTransfer> findByStatusInAndTransferDateBefore(
            List<MusharakahDomainEnums.InstallmentStatus> statuses,
            LocalDate transferDate);
}
