package com.cbs.deposit.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.deposit.dto.*;
import com.cbs.deposit.entity.*;
import com.cbs.deposit.repository.RecurringDepositInstallmentRepository;
import com.cbs.deposit.repository.RecurringDepositRepository;
import com.cbs.provider.interest.DayCountEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RecurringDepositService {

    private final RecurringDepositRepository rdRepository;
    private final RecurringDepositInstallmentRepository installmentRepository;
    private final AccountRepository accountRepository;
    private final ProductRepository productRepository;
    private final DayCountEngine dayCountEngine;
    private final CbsProperties cbsProperties;

    @Transactional
    public RecurringDepositResponse bookDeposit(CreateRecurringDepositRequest request) {
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()));

        Product product = productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        LocalDate startDate = LocalDate.now();
        LocalDate firstDueDate = calculateFirstDueDate(startDate, request.getFrequency());
        LocalDate maturityDate = calculateMaturityDate(firstDueDate, request.getFrequency(), request.getTotalInstallments());

        Long seq = rdRepository.getNextDepositSequence();
        String depositNumber = String.format("RD%012d", seq);

        RecurringDeposit rd = RecurringDeposit.builder()
                .depositNumber(depositNumber)
                .account(account)
                .customer(account.getCustomer())
                .product(product)
                .currencyCode(account.getCurrencyCode())
                .installmentAmount(request.getInstallmentAmount())
                .frequency(request.getFrequency())
                .totalInstallments(request.getTotalInstallments())
                .nextDueDate(firstDueDate)
                .interestRate(request.getInterestRate())
                .dayCountConvention(request.getDayCountConvention() != null ?
                        request.getDayCountConvention() : cbsProperties.getInterest().getDayCountConvention())
                .startDate(startDate)
                .maturityDate(maturityDate)
                .maturityAction(request.getMaturityAction() != null ?
                        request.getMaturityAction() : MaturityAction.CREDIT_ACCOUNT)
                .autoDebit(request.getAutoDebit() != null ? request.getAutoDebit() : true)
                .missedPenaltyRate(request.getMissedPenaltyRate() != null ?
                        request.getMissedPenaltyRate() : BigDecimal.ZERO)
                .status(RecurringDepositStatus.ACTIVE)
                .build();

        if (request.getDebitAccountId() != null) {
            Account debitAccount = accountRepository.findById(request.getDebitAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getDebitAccountId()));
            rd.setDebitAccount(debitAccount);
        } else {
            rd.setDebitAccount(account);
        }

        if (request.getPayoutAccountId() != null) {
            Account payoutAccount = accountRepository.findById(request.getPayoutAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getPayoutAccountId()));
            rd.setPayoutAccount(payoutAccount);
        }

        RecurringDeposit saved = rdRepository.save(rd);

        // Generate installment schedule
        LocalDate dueDate = firstDueDate;
        for (int i = 1; i <= request.getTotalInstallments(); i++) {
            RecurringDepositInstallment installment = RecurringDepositInstallment.builder()
                    .installmentNumber(i)
                    .dueDate(dueDate)
                    .amountDue(request.getInstallmentAmount())
                    .status(InstallmentStatus.PENDING)
                    .build();
            saved.addInstallment(installment);
            dueDate = advanceDate(dueDate, request.getFrequency());
        }
        rdRepository.save(saved);

        log.info("Recurring deposit booked: number={}, installment={}, freq={}, total={}",
                depositNumber, request.getInstallmentAmount(), request.getFrequency(), request.getTotalInstallments());
        return toResponse(saved);
    }

    public RecurringDepositResponse getDeposit(Long id) {
        RecurringDeposit rd = rdRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecurringDeposit", "id", id));
        return toResponse(rd);
    }

    public Page<RecurringDepositResponse> getCustomerDeposits(Long customerId, Pageable pageable) {
        return rdRepository.findByCustomerId(customerId, pageable).map(this::toResponse);
    }

    @Transactional
    public int processAutoDebits() {
        List<RecurringDeposit> dueDeposits = rdRepository.findDueForAutoDebit(LocalDate.now());
        int processed = 0;

        for (RecurringDeposit rd : dueDeposits) {
            try {
                processInstallment(rd);
                processed++;
            } catch (Exception e) {
                log.error("Auto-debit failed for RD {}: {}", rd.getDepositNumber(), e.getMessage());
            }
        }
        log.info("RD auto-debit processing: {} deposits processed", processed);
        return processed;
    }

    @Transactional
    public InstallmentDto payInstallment(Long depositId, Integer installmentNumber) {
        RecurringDeposit rd = rdRepository.findByIdWithDetails(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("RecurringDeposit", "id", depositId));

        RecurringDepositInstallment installment = installmentRepository
                .findByRecurringDepositIdAndInstallmentNumber(depositId, installmentNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Installment", "number", installmentNumber));

        if (installment.getStatus() == InstallmentStatus.PAID) {
            throw new BusinessException("Installment already paid", "INSTALLMENT_ALREADY_PAID");
        }

        Account debitAccount = rd.getDebitAccount() != null ? rd.getDebitAccount() : rd.getAccount();
        if (debitAccount.getAvailableBalance().compareTo(installment.getAmountDue()) < 0) {
            throw new BusinessException("Insufficient balance for installment", "INSUFFICIENT_BALANCE");
        }

        debitAccount.debit(installment.getAmountDue());
        accountRepository.save(debitAccount);

        installment.setAmountPaid(installment.getAmountDue());
        installment.setPaidDate(LocalDate.now());
        installment.setStatus(installment.isOverdue() ? InstallmentStatus.LATE_PAID : InstallmentStatus.PAID);
        installmentRepository.save(installment);

        rd.setTotalDeposited(rd.getTotalDeposited().add(installment.getAmountDue()));
        rd.setCurrentValue(rd.getTotalDeposited().add(rd.getAccruedInterest().setScale(2, RoundingMode.HALF_UP)));
        rd.setCompletedInstallments(rd.getCompletedInstallments() + 1);
        rd.setNextDueDate(rd.calculateNextDueDate());
        rdRepository.save(rd);

        log.info("RD {} installment #{} paid", rd.getDepositNumber(), installmentNumber);
        return toInstallmentDto(installment);
    }

    @Transactional
    public BigDecimal accrueInterest(Long depositId) {
        RecurringDeposit rd = rdRepository.findById(depositId)
                .orElseThrow(() -> new ResourceNotFoundException("RecurringDeposit", "id", depositId));

        if (rd.getStatus() != RecurringDepositStatus.ACTIVE || rd.getTotalDeposited().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal dailyInterest = dayCountEngine.calculateDailyAccrual(
                rd.getTotalDeposited(), rd.getInterestRate(), LocalDate.now());

        rd.setAccruedInterest(rd.getAccruedInterest().add(dailyInterest));
        rd.setCurrentValue(rd.getTotalDeposited().add(rd.getAccruedInterest().setScale(2, RoundingMode.HALF_UP)));
        rdRepository.save(rd);
        return dailyInterest;
    }

    private void processInstallment(RecurringDeposit rd) {
        List<RecurringDepositInstallment> pending = installmentRepository
                .findOverdueInstallments(rd.getId(), LocalDate.now());

        if (pending.isEmpty()) return;

        RecurringDepositInstallment installment = pending.get(0);
        Account debitAccount = rd.getDebitAccount() != null ? rd.getDebitAccount() : rd.getAccount();

        if (debitAccount.getAvailableBalance().compareTo(installment.getAmountDue()) < 0) {
            installment.setStatus(InstallmentStatus.MISSED);
            installmentRepository.save(installment);
            rd.setMissedInstallments(rd.getMissedInstallments() + 1);
            rdRepository.save(rd);
            log.warn("RD {} installment #{} missed: insufficient balance", rd.getDepositNumber(), installment.getInstallmentNumber());
            return;
        }

        debitAccount.debit(installment.getAmountDue());
        accountRepository.save(debitAccount);

        installment.setAmountPaid(installment.getAmountDue());
        installment.setPaidDate(LocalDate.now());
        installment.setStatus(InstallmentStatus.PAID);
        installmentRepository.save(installment);

        rd.setTotalDeposited(rd.getTotalDeposited().add(installment.getAmountDue()));
        rd.setCurrentValue(rd.getTotalDeposited().add(rd.getAccruedInterest().setScale(2, RoundingMode.HALF_UP)));
        rd.setCompletedInstallments(rd.getCompletedInstallments() + 1);
        rd.setNextDueDate(rd.calculateNextDueDate());
        rdRepository.save(rd);
    }

    private LocalDate calculateFirstDueDate(LocalDate start, DepositFrequency freq) {
        return advanceDate(start, freq);
    }

    private LocalDate calculateMaturityDate(LocalDate firstDue, DepositFrequency freq, int totalInstallments) {
        LocalDate date = firstDue;
        for (int i = 1; i < totalInstallments; i++) {
            date = advanceDate(date, freq);
        }
        return date;
    }

    private LocalDate advanceDate(LocalDate date, DepositFrequency freq) {
        return switch (freq) {
            case WEEKLY -> date.plusWeeks(1);
            case BI_WEEKLY -> date.plusWeeks(2);
            case MONTHLY -> date.plusMonths(1);
            case QUARTERLY -> date.plusMonths(3);
        };
    }

    private RecurringDepositResponse toResponse(RecurringDeposit rd) {
        List<InstallmentDto> installmentDtos = installmentRepository
                .findByRecurringDepositIdOrderByInstallmentNumberAsc(rd.getId())
                .stream().map(this::toInstallmentDto).toList();

        return RecurringDepositResponse.builder()
                .id(rd.getId()).depositNumber(rd.getDepositNumber())
                .accountId(rd.getAccount().getId()).accountNumber(rd.getAccount().getAccountNumber())
                .customerId(rd.getCustomer().getId()).customerDisplayName(rd.getCustomer().getDisplayName())
                .productCode(rd.getProduct().getCode()).currencyCode(rd.getCurrencyCode())
                .installmentAmount(rd.getInstallmentAmount()).frequency(rd.getFrequency())
                .totalInstallments(rd.getTotalInstallments()).completedInstallments(rd.getCompletedInstallments())
                .missedInstallments(rd.getMissedInstallments()).nextDueDate(rd.getNextDueDate())
                .totalDeposited(rd.getTotalDeposited()).accruedInterest(rd.getAccruedInterest())
                .totalInterestEarned(rd.getTotalInterestEarned()).currentValue(rd.getCurrentValue())
                .interestRate(rd.getInterestRate()).startDate(rd.getStartDate()).maturityDate(rd.getMaturityDate())
                .totalPenalties(rd.getTotalPenalties()).maturityAction(rd.getMaturityAction())
                .autoDebit(rd.getAutoDebit()).status(rd.getStatus())
                .installments(installmentDtos).createdAt(rd.getCreatedAt())
                .build();
    }

    private InstallmentDto toInstallmentDto(RecurringDepositInstallment i) {
        return InstallmentDto.builder()
                .id(i.getId()).installmentNumber(i.getInstallmentNumber())
                .dueDate(i.getDueDate()).paidDate(i.getPaidDate())
                .amountDue(i.getAmountDue()).amountPaid(i.getAmountPaid())
                .penaltyAmount(i.getPenaltyAmount()).status(i.getStatus())
                .transactionRef(i.getTransactionRef()).overdue(i.isOverdue())
                .build();
    }
}
