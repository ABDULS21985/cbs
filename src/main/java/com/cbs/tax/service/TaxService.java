package com.cbs.tax.service;

import com.cbs.gl.dto.JournalLineRequest;
import com.cbs.gl.dto.PostJournalRequest;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.tax.entity.*;
import com.cbs.tax.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TaxService {

    private final TaxRuleRepository ruleRepository;
    private final TaxTransactionRepository txnRepository;
    private final GeneralLedgerService glService;

    /**
     * Calculates and deducts all applicable taxes for a transaction event.
     * Checks exemptions per customer type and product code.
     */
    @Transactional
    public List<TaxTransaction> calculateAndDeductTax(String appliesTo, BigDecimal baseAmount,
                                                        String currencyCode, Long accountId, Long customerId,
                                                        String customerType, String productCode,
                                                        String sourceModule, String sourceRef) {
        List<TaxRule> rules = ruleRepository.findApplicableRules(appliesTo, LocalDate.now());
        List<TaxTransaction> taxTransactions = new ArrayList<>();

        for (TaxRule rule : rules) {
            if (rule.isExempt(customerType, productCode)) continue;
            if (rule.getThresholdAmount() != null && baseAmount.compareTo(rule.getThresholdAmount()) < 0) continue;

            BigDecimal taxAmount = baseAmount.multiply(rule.getTaxRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            // Post to GL if GL codes configured
            Long journalId = null;
            if (rule.getTaxPayableGl() != null && accountId != null) {
                try {
                    var journal = glService.postJournal(new PostJournalRequest(
                            "SYSTEM",
                            "Tax deduction: " + rule.getTaxCode(),
                            sourceModule,
                            sourceRef,
                            LocalDate.now(),
                            List.of(
                                    new JournalLineRequest(
                                            rule.getTaxReceivableGl() != null ? rule.getTaxReceivableGl() : "3100",
                                            taxAmount, BigDecimal.ZERO, currencyCode, null,
                                            rule.getTaxName() + " on " + appliesTo, null, null, accountId, customerId),
                                    new JournalLineRequest(
                                            rule.getTaxPayableGl(), BigDecimal.ZERO, taxAmount, currencyCode, null,
                                            rule.getTaxName() + " payable", null, null, null, null)
                            )));
                    journalId = journal.getId();
                } catch (Exception e) {
                    log.warn("Tax GL posting failed for {}: {}", rule.getTaxCode(), e.getMessage());
                }
            }

            TaxTransaction txn = TaxTransaction.builder()
                    .taxCode(rule.getTaxCode()).taxType(rule.getTaxType())
                    .sourceModule(sourceModule).sourceRef(sourceRef)
                    .accountId(accountId).customerId(customerId)
                    .baseAmount(baseAmount).taxRateApplied(rule.getTaxRate())
                    .taxAmount(taxAmount).currencyCode(currencyCode)
                    .journalId(journalId).status("DEDUCTED").build();

            taxTransactions.add(txnRepository.save(txn));
            log.info("Tax deducted: code={}, rate={}%, amount={}, base={}", rule.getTaxCode(), rule.getTaxRate(), taxAmount, baseAmount);
        }

        return taxTransactions;
    }

    /**
     * Preview tax without deducting.
     */
    public List<TaxPreview> previewTax(String appliesTo, BigDecimal baseAmount, String customerType, String productCode) {
        List<TaxRule> rules = ruleRepository.findApplicableRules(appliesTo, LocalDate.now());
        return rules.stream()
                .filter(r -> !r.isExempt(customerType, productCode))
                .filter(r -> r.getThresholdAmount() == null || baseAmount.compareTo(r.getThresholdAmount()) >= 0)
                .map(r -> new TaxPreview(r.getTaxCode(), r.getTaxName(), r.getTaxType(), r.getTaxRate(),
                        baseAmount.multiply(r.getTaxRate()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)))
                .toList();
    }

    @Transactional
    public TaxRule createRule(TaxRule rule) { return ruleRepository.save(rule); }

    public Page<TaxTransaction> getAccountTaxHistory(Long accountId, Pageable pageable) {
        return txnRepository.findByAccountIdOrderByCreatedAtDesc(accountId, pageable);
    }

    public Page<TaxTransaction> getPendingRemittance(Pageable pageable) {
        return txnRepository.findByStatusOrderByCreatedAtDesc("DEDUCTED", pageable);
    }

    public record TaxPreview(String taxCode, String taxName, String taxType, BigDecimal rate, BigDecimal amount) {}
}
