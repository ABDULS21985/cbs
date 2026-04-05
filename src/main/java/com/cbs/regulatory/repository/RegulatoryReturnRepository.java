package com.cbs.regulatory.repository;

import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RegulatoryReturnRepository extends JpaRepository<RegulatoryReturn, Long> {

    Optional<RegulatoryReturn> findByReturnRef(String returnRef);

    Optional<RegulatoryReturn> findTopByTemplateIdAndPeriodFromAndPeriodToOrderByReturnDataVersionDesc(Long templateId,
                                                                                                        LocalDate periodFrom,
                                                                                                        LocalDate periodTo);

    Optional<RegulatoryReturn> findTopByTemplateCodeAndPeriodToBeforeOrderByPeriodToDesc(String templateCode,
                                                                                          LocalDate periodTo);

    List<RegulatoryReturn> findByJurisdictionAndPeriodFromBetweenOrderByPeriodFromDesc(
            RegulatoryDomainEnums.Jurisdiction jurisdiction,
            LocalDate from,
            LocalDate to);

    List<RegulatoryReturn> findByStatusOrderByFilingDeadlineAsc(RegulatoryDomainEnums.ReturnStatus status);

    List<RegulatoryReturn> findByStatusInOrderByFilingDeadlineAsc(List<RegulatoryDomainEnums.ReturnStatus> statuses);

    List<RegulatoryReturn> findByJurisdictionAndStatusOrderByPeriodToDesc(RegulatoryDomainEnums.Jurisdiction jurisdiction,
                                                                          RegulatoryDomainEnums.ReturnStatus status);

    List<RegulatoryReturn> findByTemplateCodeAndPeriodFromAndPeriodToOrderByReturnDataVersionDesc(String templateCode,
                                                                                                   LocalDate periodFrom,
                                                                                                   LocalDate periodTo);

    List<RegulatoryReturn> findByFilingDeadlineBetweenOrderByFilingDeadlineAsc(LocalDate from, LocalDate to);

    List<RegulatoryReturn> findByDeadlineBreachTrueOrderByFilingDeadlineAsc();
}
