package com.cbs.ftp.repository;

import com.cbs.ftp.entity.FtpRateCurve;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FtpRateCurveRepository extends JpaRepository<FtpRateCurve, Long> {
    @Query("SELECT f FROM FtpRateCurve f WHERE f.curveName = :curve AND f.currencyCode = :ccy " +
           "AND f.effectiveDate <= :date AND f.tenorDays = :tenor ORDER BY f.effectiveDate DESC")
    Optional<FtpRateCurve> findLatestRate(@Param("curve") String curve, @Param("ccy") String ccy,
                                            @Param("date") LocalDate date, @Param("tenor") int tenor);

    List<FtpRateCurve> findByCurveNameAndCurrencyCodeAndEffectiveDateLessThanEqualOrderByTenorDaysAscEffectiveDateDesc(
            String curveName, String currencyCode, LocalDate effectiveDate);
}
