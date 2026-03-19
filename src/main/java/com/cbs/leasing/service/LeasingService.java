package com.cbs.leasing.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.leasing.entity.LeaseContract;
import com.cbs.leasing.repository.LeaseContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class LeasingService {

    private final LeaseContractRepository leaseRepository;

    @Transactional
    public LeaseContract createLease(LeaseContract lease) {
        lease.setLeaseNumber("LSE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // IFRS 16: Calculate Right-of-Use asset and lease liability
        if ("RIGHT_OF_USE".equals(lease.getIfrs16Classification())) {
            BigDecimal liability = calculatePresentValue(
                    lease.getPeriodicPayment(), lease.getImplicitRate(), lease.getTermMonths(), lease.getPaymentFrequency());
            lease.setLeaseLiability(liability);
            // ROU asset = liability + advance payments + initial direct costs - incentives
            BigDecimal rouAsset = liability.add(lease.getSecurityDeposit());
            lease.setRouAssetAmount(rouAsset);
        }

        lease.setCurrentBalance(lease.getPrincipalAmount());
        lease.setStatus("DRAFT");
        LeaseContract saved = leaseRepository.save(lease);
        log.info("Lease created: number={}, type={}, asset={}, amount={}, term={}m, IFRS16={}",
                saved.getLeaseNumber(), saved.getLeaseType(), saved.getAssetCategory(),
                saved.getPrincipalAmount(), saved.getTermMonths(), saved.getIfrs16Classification());
        return saved;
    }

    @Transactional
    public LeaseContract activate(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (!"DRAFT".equals(lease.getStatus()) && !"APPROVED".equals(lease.getStatus()))
            throw new BusinessException("Only DRAFT/APPROVED leases can be activated");
        lease.setStatus("ACTIVE");
        lease.setCommencementDate(LocalDate.now());
        lease.setMaturityDate(LocalDate.now().plusMonths(lease.getTermMonths()));
        lease.setUpdatedAt(Instant.now());
        log.info("Lease activated: number={}, maturity={}", leaseNumber, lease.getMaturityDate());
        return leaseRepository.save(lease);
    }

    @Transactional
    public LeaseContract recordDepreciation(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (!"ACTIVE".equals(lease.getStatus())) throw new BusinessException("Lease not active");
        if (lease.getRouAssetAmount() == null) throw new BusinessException("No ROU asset to depreciate");

        BigDecimal monthlyDepreciation;
        if ("STRAIGHT_LINE".equals(lease.getDepreciationMethod())) {
            BigDecimal depreciableAmount = lease.getRouAssetAmount().subtract(
                    lease.getResidualValue() != null ? lease.getResidualValue() : BigDecimal.ZERO);
            monthlyDepreciation = depreciableAmount.divide(BigDecimal.valueOf(lease.getTermMonths()), 4, RoundingMode.HALF_UP);
        } else {
            // Declining balance: 2/useful_life * (ROU - accumulated)
            BigDecimal rate = new BigDecimal("2").divide(BigDecimal.valueOf(lease.getTermMonths()), 6, RoundingMode.HALF_UP);
            monthlyDepreciation = lease.getRouAssetAmount().subtract(lease.getAccumulatedDepreciation()).multiply(rate);
        }

        lease.setAccumulatedDepreciation(lease.getAccumulatedDepreciation().add(monthlyDepreciation));
        lease.setUpdatedAt(Instant.now());
        log.debug("Lease depreciation: number={}, monthly={}, accumulated={}", leaseNumber, monthlyDepreciation, lease.getAccumulatedDepreciation());
        return leaseRepository.save(lease);
    }

    @Transactional
    public LeaseContract exercisePurchaseOption(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (lease.getPurchaseOptionPrice() == null) throw new BusinessException("No purchase option on this lease");
        lease.setStatus("BUYOUT_EXERCISED");
        lease.setCurrentBalance(BigDecimal.ZERO);
        lease.setUpdatedAt(Instant.now());
        log.info("Lease purchase option exercised: number={}, price={}", leaseNumber, lease.getPurchaseOptionPrice());
        return leaseRepository.save(lease);
    }

    @Transactional
    public LeaseContract earlyTerminate(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (!"ACTIVE".equals(lease.getStatus())) throw new BusinessException("Lease not active");
        lease.setStatus("EARLY_TERMINATED");
        lease.setUpdatedAt(Instant.now());
        log.info("Lease early terminated: number={}, fee={}%", leaseNumber, lease.getEarlyTerminationFee());
        return leaseRepository.save(lease);
    }

    public List<LeaseContract> getByCustomer(Long customerId) { return leaseRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<LeaseContract> getByAssetCategory(String category) { return leaseRepository.findByAssetCategoryAndStatusOrderByCreatedAtDesc(category, "ACTIVE"); }

    private LeaseContract getByNumber(String number) {
        return leaseRepository.findByLeaseNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("LeaseContract", "leaseNumber", number));
    }

    private BigDecimal calculatePresentValue(BigDecimal payment, BigDecimal annualRate, int months, String frequency) {
        int periodsPerYear = switch (frequency) { case "QUARTERLY" -> 4; case "SEMI_ANNUAL" -> 2; case "ANNUAL" -> 1; default -> 12; };
        int totalPeriods = months * periodsPerYear / 12;
        double r = annualRate.doubleValue() / (periodsPerYear * 100.0);
        double pv = payment.doubleValue() * (1 - Math.pow(1 + r, -totalPeriods)) / r;
        return BigDecimal.valueOf(pv).setScale(4, RoundingMode.HALF_UP);
    }

    public java.util.List<LeaseContract> getAllLeases() {
        return leaseRepository.findAll();
    }

}
