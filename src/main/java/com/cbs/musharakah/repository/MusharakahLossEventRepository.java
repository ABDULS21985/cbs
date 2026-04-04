package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahLossEvent;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MusharakahLossEventRepository extends JpaRepository<MusharakahLossEvent, Long> {

    Optional<MusharakahLossEvent> findByLossEventRef(String lossEventRef);

    List<MusharakahLossEvent> findByContractIdOrderByLossDateAsc(Long contractId);

    List<MusharakahLossEvent> findByLossTypeAndStatus(MusharakahDomainEnums.LossType lossType,
                                                      MusharakahDomainEnums.LossStatus status);
}
