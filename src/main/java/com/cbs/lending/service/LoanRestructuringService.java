package com.cbs.lending.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.lending.dto.LoanAccountResponse;
import com.cbs.lending.dto.LoanRestructureRequest;
import com.cbs.lending.engine.RepaymentScheduleGenerator;
import com.cbs.lending.entity.*;
import com.cbs.lending.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LoanRestructuringService {

    private final LoanAccountRepository loanAccountRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanRestructureLogRepository restructureLogRepository;
    private final RepaymentScheduleGenerator scheduleGenerator;

    @Transactional
    public LoanRestructureLog restructureLoan(Long loanId, LoanRestructureRequest request, String approvedBy) {
        LoanAccount loan = loanAccountRepository.findByIdWithDetails(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", "id", loanId));

        if (!loan.isActive() && loan.getStatus() != LoanAccountStatus.DELINQUENT) {
            throw new BusinessException("Only active or delinquent loans can be restructured", "LOAN_NOT_RESTRUCTURABLE");
        }

        // Capture before-state
        LoanRestructureLog logEntry = LoanRestructureLog.builder()
                .loanAccountId(loanId)
                .restructureType(request.getRestructureType())
                .oldInterestRate(loan.getInterestRate())
                .oldTenureMonths(loan.getTenureMonths())
                .oldEmiAmount(loan.getEmiAmount())
                .oldOutstanding(loan.getOutstandingPrincipal())
                .oldNextDueDate(loan.getNextDueDate())
                .oldScheduleType(loan.getRepaymentScheduleType().name())
                .reason(request.getReason())
                .approvedBy(approvedBy)
                .approvedAt(Instant.now())
                .status("EXECUTED")
                .build();

        switch (request.getRestructureType()) {
            case RESCHEDULE -> executeReschedule(loan, request);
            case TENURE_EXTENSION -> executeTenureExtension(loan, request);
            case RATE_CHANGE -> executeRateChange(loan, request);
            case MORATORIUM -> executeMoratorium(loan, request, logEntry);
            case PARTIAL_WRITE_OFF -> executePartialWriteOff(loan, request);
            case NPL_MIGRATION -> {
                loan.setStatus(LoanAccountStatus.DEFAULT);
                loan.setIfrs9Stage(3);
                loan.updateDelinquency();
            }
            default -> throw new BusinessException("Unsupported restructure type: " + request.getRestructureType(),
                    "UNSUPPORTED_RESTRUCTURE");
        }

        loan.setStatus(LoanAccountStatus.RESTRUCTURED);
        loanAccountRepository.save(loan);

        // Capture after-state
        logEntry.setNewInterestRate(loan.getInterestRate());
        logEntry.setNewTenureMonths(loan.getTenureMonths());
        logEntry.setNewEmiAmount(loan.getEmiAmount());
        logEntry.setNewOutstanding(loan.getOutstandingPrincipal());
        logEntry.setNewNextDueDate(loan.getNextDueDate());
        logEntry.setNewScheduleType(loan.getRepaymentScheduleType().name());

        LoanRestructureLog saved = restructureLogRepository.save(logEntry);
        log.info("Loan {} restructured: type={}, by={}", loan.getLoanNumber(), request.getRestructureType(), approvedBy);
        return saved;
    }

    public List<LoanRestructureLog> getRestructureHistory(Long loanId) {
        return restructureLogRepository.findByLoanAccountIdOrderByCreatedAtDesc(loanId);
    }

    private void executeReschedule(LoanAccount loan, LoanRestructureRequest request) {
        Integer newTenure = request.getNewTenureMonths() != null ? request.getNewTenureMonths() : loan.getTenureMonths();
        BigDecimal newRate = request.getNewInterestRate() != null ? request.getNewInterestRate() : loan.getInterestRate();
        RepaymentScheduleType newType = request.getNewScheduleType() != null ?
                request.getNewScheduleType() : loan.getRepaymentScheduleType();

        // Clear remaining pending installments
        clearPendingInstallments(loan.getId());

        // Regenerate schedule from outstanding principal
        LocalDate nextDue = LocalDate.now().plusMonths(1);
        int remainingInstallments = newTenure - loan.getPaidInstallments();
        if (remainingInstallments < 1) remainingInstallments = newTenure;

        List<LoanRepaymentSchedule> newSchedule = scheduleGenerator.generate(
                loan.getOutstandingPrincipal(), newRate, remainingInstallments, newType, nextDue);

        int startNumber = loan.getPaidInstallments() + 1;
        for (int i = 0; i < newSchedule.size(); i++) {
            LoanRepaymentSchedule entry = newSchedule.get(i);
            entry.setInstallmentNumber(startNumber + i);
            loan.addScheduleEntry(entry);
        }

        loan.setInterestRate(newRate);
        loan.setTenureMonths(newTenure);
        loan.setTotalInstallments(loan.getPaidInstallments() + remainingInstallments);
        loan.setRepaymentScheduleType(newType);
        loan.setNextDueDate(nextDue);
        loan.setEmiAmount(scheduleGenerator.calculateEmi(loan.getOutstandingPrincipal(), newRate, remainingInstallments));
        loan.setMaturityDate(nextDue.plusMonths(remainingInstallments - 1));
    }

    private void executeTenureExtension(LoanAccount loan, LoanRestructureRequest request) {
        if (request.getNewTenureMonths() == null || request.getNewTenureMonths() <= loan.getTenureMonths()) {
            throw new BusinessException("New tenure must be longer than current tenure", "INVALID_TENURE_EXTENSION");
        }
        request.setNewScheduleType(loan.getRepaymentScheduleType());
        executeReschedule(loan, request);
    }

    private void executeRateChange(LoanAccount loan, LoanRestructureRequest request) {
        if (request.getNewInterestRate() == null) {
            throw new BusinessException("New interest rate is required for rate change", "MISSING_NEW_RATE");
        }
        request.setNewTenureMonths(loan.getTenureMonths());
        request.setNewScheduleType(loan.getRepaymentScheduleType());
        executeReschedule(loan, request);
    }

    private void executeMoratorium(LoanAccount loan, LoanRestructureRequest request, LoanRestructureLog logEntry) {
        if (request.getMoratoriumMonths() == null || request.getMoratoriumMonths() < 1) {
            throw new BusinessException("Moratorium months is required", "MISSING_MORATORIUM_MONTHS");
        }

        LocalDate moratoriumEnd = LocalDate.now().plusMonths(request.getMoratoriumMonths());
        logEntry.setMoratoriumMonths(request.getMoratoriumMonths());
        logEntry.setMoratoriumEndDate(moratoriumEnd);
        logEntry.setInterestDuringMoratorium(
                request.getInterestDuringMoratorium() != null ? request.getInterestDuringMoratorium() : "CAPITALIZE");

        // Push all pending installment dates forward
        List<LoanRepaymentSchedule> pending = scheduleRepository.findPendingInstallments(loan.getId());
        for (LoanRepaymentSchedule entry : pending) {
            entry.setDueDate(entry.getDueDate().plusMonths(request.getMoratoriumMonths()));
        }
        scheduleRepository.saveAll(pending);

        loan.setNextDueDate(moratoriumEnd.plusMonths(1));
        loan.setTenureMonths(loan.getTenureMonths() + request.getMoratoriumMonths());
        loan.setMaturityDate(loan.getMaturityDate().plusMonths(request.getMoratoriumMonths()));
    }

    private void executePartialWriteOff(LoanAccount loan, LoanRestructureRequest request) {
        if (request.getWriteOffAmount() == null || request.getWriteOffAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Write-off amount is required", "MISSING_WRITE_OFF_AMOUNT");
        }
        if (request.getWriteOffAmount().compareTo(loan.getOutstandingPrincipal()) > 0) {
            throw new BusinessException("Write-off amount exceeds outstanding principal", "EXCEEDS_OUTSTANDING");
        }

        loan.setOutstandingPrincipal(loan.getOutstandingPrincipal().subtract(request.getWriteOffAmount()));

        // Regenerate remaining schedule on reduced principal
        clearPendingInstallments(loan.getId());
        int remainingInstallments = loan.getTotalInstallments() - loan.getPaidInstallments();
        if (remainingInstallments < 1) remainingInstallments = 1;

        LocalDate nextDue = loan.getNextDueDate() != null ? loan.getNextDueDate() : LocalDate.now().plusMonths(1);
        List<LoanRepaymentSchedule> newSchedule = scheduleGenerator.generate(
                loan.getOutstandingPrincipal(), loan.getInterestRate(), remainingInstallments,
                loan.getRepaymentScheduleType(), nextDue);

        int startNumber = loan.getPaidInstallments() + 1;
        for (int i = 0; i < newSchedule.size(); i++) {
            LoanRepaymentSchedule entry = newSchedule.get(i);
            entry.setInstallmentNumber(startNumber + i);
            loan.addScheduleEntry(entry);
        }

        loan.setEmiAmount(scheduleGenerator.calculateEmi(
                loan.getOutstandingPrincipal(), loan.getInterestRate(), remainingInstallments));
    }

    private void clearPendingInstallments(Long loanId) {
        List<LoanRepaymentSchedule> pending = scheduleRepository.findPendingInstallments(loanId);
        scheduleRepository.deleteAll(pending);
    }
}
