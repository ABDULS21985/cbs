package com.cbs.overdraft.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.overdraft.dto.*;
import com.cbs.overdraft.entity.*;
import com.cbs.overdraft.repository.*;
import com.cbs.provider.interest.DayCountEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OverdraftService {

    private final CreditFacilityRepository facilityRepository;
    private final FacilityUtilizationLogRepository utilizationLogRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final DayCountEngine dayCountEngine;
    private final CbsProperties cbsProperties;

    @Transactional
    public FacilityResponse createFacility(CreateFacilityRequest request) {
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()));

        if (request.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessException("Expiry date must be in the future", "INVALID_EXPIRY");
        }

        Long seq = facilityRepository.getNextFacilitySequence();
        String facilityNumber = String.format("CF%012d", seq);

        CreditFacility facility = CreditFacility.builder()
                .facilityNumber(facilityNumber)
                .account(account)
                .customer(account.getCustomer())
                .facilityType(request.getFacilityType())
                .sanctionedLimit(request.getSanctionedLimit())
                .availableLimit(request.getSanctionedLimit())
                .currencyCode(account.getCurrencyCode())
                .interestRate(request.getInterestRate())
                .penaltyRate(request.getPenaltyRate() != null ? request.getPenaltyRate() : BigDecimal.ZERO)
                .dayCountConvention(request.getDayCountConvention() != null ?
                        request.getDayCountConvention() : cbsProperties.getInterest().getDayCountConvention())
                .expiryDate(request.getExpiryDate())
                .autoRenewal(request.getAutoRenewal() != null ? request.getAutoRenewal() : false)
                .maxRenewals(request.getMaxRenewals())
                .interestPostingDay(request.getInterestPostingDay() != null ? request.getInterestPostingDay() : 1)
                .status(FacilityStatus.ACTIVE)
                .build();

        // Update account overdraft limit
        account.setOverdraftLimit(account.getOverdraftLimit().add(request.getSanctionedLimit()));
        accountRepository.save(account);

        CreditFacility saved = facilityRepository.save(facility);
        log.info("Credit facility created: number={}, type={}, limit={}, account={}",
                facilityNumber, request.getFacilityType(), request.getSanctionedLimit(), account.getAccountNumber());
        return toResponse(saved);
    }

    public FacilityResponse getFacility(Long id) {
        CreditFacility facility = facilityRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("CreditFacility", "id", id));
        return toResponse(facility);
    }

    public Page<FacilityResponse> getCustomerFacilities(Long customerId, Pageable pageable) {
        return facilityRepository.findByCustomerId(customerId, pageable).map(this::toResponse);
    }

    public Page<FacilityResponse> listAllFacilities(Pageable pageable) {
        return facilityRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public FacilityResponse drawdown(Long facilityId, BigDecimal amount, String narration) {
        CreditFacility facility = facilityRepository.findByIdWithDetails(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("CreditFacility", "id", facilityId));

        if (!facility.isActive()) {
            throw new BusinessException("Facility is not active", "FACILITY_NOT_ACTIVE");
        }
        if (!facility.hasAvailableLimit(amount)) {
            throw new BusinessException(String.format("Drawdown amount %s exceeds available limit %s",
                    amount, facility.getAvailableLimit()), "EXCEEDS_AVAILABLE_LIMIT");
        }

        facility.drawdown(amount);

        Account account = facility.getAccount();
        accountPostingService.postCreditAgainstGl(
                account,
                TransactionType.CREDIT,
                amount,
                narration != null ? narration : "Facility drawdown " + facility.getFacilityNumber(),
                TransactionChannel.SYSTEM,
                facility.getFacilityNumber() + ":DRWDN",
                resolveOverdraftAssetGlCode(),
                "OVERDRAFT",
                facility.getFacilityNumber()
        );

        logUtilization(facility, UtilizationType.DRAWDOWN, amount, narration);
        facilityRepository.save(facility);

        log.info("Facility drawdown: number={}, amount={}, utilized={}, available={}",
                facility.getFacilityNumber(), amount, facility.getUtilizedAmount(), facility.getAvailableLimit());
        return toResponse(facility);
    }

    @Transactional
    public FacilityResponse repay(Long facilityId, BigDecimal amount, String narration) {
        CreditFacility facility = facilityRepository.findByIdWithDetails(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("CreditFacility", "id", facilityId));

        if (amount.compareTo(facility.getUtilizedAmount()) > 0) {
            amount = facility.getUtilizedAmount(); // Cap at utilized
        }

        facility.repay(amount);

        Account account = facility.getAccount();
        accountPostingService.postDebitAgainstGl(
                account,
                TransactionType.DEBIT,
                amount,
                narration != null ? narration : "Facility repayment " + facility.getFacilityNumber(),
                TransactionChannel.SYSTEM,
                facility.getFacilityNumber() + ":REPAY",
                resolveOverdraftAssetGlCode(),
                "OVERDRAFT",
                facility.getFacilityNumber()
        );

        logUtilization(facility, UtilizationType.REPAYMENT, amount, narration);
        facilityRepository.save(facility);

        log.info("Facility repayment: number={}, amount={}, utilized={}, available={}",
                facility.getFacilityNumber(), amount, facility.getUtilizedAmount(), facility.getAvailableLimit());
        return toResponse(facility);
    }

    @Transactional
    public BigDecimal accrueInterest(Long facilityId) {
        CreditFacility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("CreditFacility", "id", facilityId));

        if (!facility.isActive() || facility.getUtilizedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal dailyInterest = dayCountEngine.calculateDailyAccrual(
                facility.getUtilizedAmount(), facility.getInterestRate(), LocalDate.now());

        facility.setAccruedInterest(facility.getAccruedInterest().add(dailyInterest));
        facility.setTotalInterestCharged(facility.getTotalInterestCharged().add(
                dailyInterest.setScale(2, RoundingMode.HALF_UP)));
        facilityRepository.save(facility);
        return dailyInterest;
    }

    @Transactional
    public int batchAccrueInterest() {
        List<CreditFacility> facilities = facilityRepository.findActiveUtilizedFacilities();
        int count = 0;
        for (CreditFacility f : facilities) {
            try { accrueInterest(f.getId()); count++; }
            catch (Exception e) { log.error("Facility interest accrual failed for {}: {}", f.getFacilityNumber(), e.getMessage()); }
        }
        log.info("Facility batch accrual: {} facilities processed", count);
        return count;
    }

    @Transactional
    public FacilityResponse postInterest(Long facilityId) {
        CreditFacility facility = facilityRepository.findByIdWithDetails(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("CreditFacility", "id", facilityId));

        BigDecimal interest = facility.getAccruedInterest()
                .setScale(cbsProperties.getInterest().getPostingScale(), RoundingMode.HALF_UP);
        if (interest.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("No accrued interest to post", "NO_ACCRUED_INTEREST");
        }

        // Debit interest from account (increases utilization if overdraft)
        facility.drawdown(interest);
        facility.setAccruedInterest(BigDecimal.ZERO);

        logUtilization(facility, UtilizationType.INTEREST_CHARGE, interest, "Interest charge posting");
        facilityRepository.save(facility);

        log.info("Facility interest posted: number={}, amount={}", facility.getFacilityNumber(), interest);
        return toResponse(facility);
    }

    @Transactional
    public int processExpiredFacilities() {
        List<CreditFacility> expired = facilityRepository.findExpiredFacilities(LocalDate.now());
        int count = 0;
        for (CreditFacility facility : expired) {
            if (Boolean.TRUE.equals(facility.getAutoRenewal()) &&
                    (facility.getMaxRenewals() == null || facility.getRenewalCount() < facility.getMaxRenewals())) {
                // Auto-renew for another year
                facility.setExpiryDate(facility.getExpiryDate().plusYears(1));
                facility.setRenewalCount(facility.getRenewalCount() + 1);
                facility.setLastReviewDate(LocalDate.now());
                log.info("Facility {} auto-renewed (count: {})", facility.getFacilityNumber(), facility.getRenewalCount());
            } else {
                facility.setStatus(FacilityStatus.EXPIRED);
                // Remove overdraft limit from account
                Account account = facility.getAccount();
                account.setOverdraftLimit(account.getOverdraftLimit().subtract(facility.getSanctionedLimit()).max(BigDecimal.ZERO));
                accountRepository.save(account);
                log.info("Facility {} expired", facility.getFacilityNumber());
            }
            facilityRepository.save(facility);
            count++;
        }
        log.info("Facility expiry processing: {} facilities processed", count);
        return count;
    }

    public Page<FacilityUtilizationLog> getUtilizationHistory(Long facilityId, Pageable pageable) {
        facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("CreditFacility", "id", facilityId));
        return utilizationLogRepository.findByFacilityIdOrderByCreatedAtDesc(facilityId, pageable);
    }

    private void logUtilization(CreditFacility facility, UtilizationType type, BigDecimal amount, String narration) {
        FacilityUtilizationLog logEntry = FacilityUtilizationLog.builder()
                .facility(facility).transactionType(type)
                .amount(amount).runningUtilized(facility.getUtilizedAmount())
                .runningAvailable(facility.getAvailableLimit())
                .narration(narration).build();
        utilizationLogRepository.save(logEntry);
    }

    private String resolveOverdraftAssetGlCode() {
        String glCode = cbsProperties.getLedger().getOverdraftAssetGlCode();
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("CBS_LEDGER_OVERDRAFT_ASSET_GL is required for facility postings",
                    "MISSING_OVERDRAFT_ASSET_GL");
        }
        return glCode;
    }

    private FacilityResponse toResponse(CreditFacility f) {
        return FacilityResponse.builder()
                .id(f.getId()).facilityNumber(f.getFacilityNumber())
                .accountId(f.getAccount().getId()).accountNumber(f.getAccount().getAccountNumber())
                .customerId(f.getCustomer().getId()).customerDisplayName(f.getCustomer().getDisplayName())
                .facilityType(f.getFacilityType())
                .sanctionedLimit(f.getSanctionedLimit()).availableLimit(f.getAvailableLimit())
                .utilizedAmount(f.getUtilizedAmount()).currencyCode(f.getCurrencyCode())
                .interestRate(f.getInterestRate()).penaltyRate(f.getPenaltyRate())
                .accruedInterest(f.getAccruedInterest())
                .totalInterestCharged(f.getTotalInterestCharged()).totalInterestPaid(f.getTotalInterestPaid())
                .effectiveDate(f.getEffectiveDate()).expiryDate(f.getExpiryDate())
                .lastReviewDate(f.getLastReviewDate()).nextReviewDate(f.getNextReviewDate())
                .autoRenewal(f.getAutoRenewal()).renewalCount(f.getRenewalCount())
                .maxRenewals(f.getMaxRenewals()).status(f.getStatus()).createdAt(f.getCreatedAt()).build();
    }
}
