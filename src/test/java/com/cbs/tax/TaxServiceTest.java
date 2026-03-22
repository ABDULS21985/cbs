package com.cbs.tax;

import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.tax.entity.TaxRule;
import com.cbs.tax.entity.TaxTransaction;
import com.cbs.tax.repository.TaxRuleRepository;
import com.cbs.tax.repository.TaxTransactionRepository;
import com.cbs.tax.service.TaxService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaxServiceTest {

    @Mock
    private TaxRuleRepository ruleRepository;

    @Mock
    private TaxTransactionRepository txnRepository;

    @Mock
    private GeneralLedgerService glService;

    @InjectMocks
    private TaxService service;

    @Test
    @DisplayName("createRule saves and returns a rule")
    void createRuleSavesAndReturns() {
        TaxRule rule = TaxRule.builder()
                .taxCode("VAT")
                .taxName("Value Added Tax")
                .taxType("INDIRECT")
                .taxRate(new BigDecimal("15.0000"))
                .appliesTo("PAYMENT")
                .build();

        when(ruleRepository.save(any(TaxRule.class))).thenAnswer(i -> {
            TaxRule saved = i.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        TaxRule result = service.createRule(rule);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTaxCode()).isEqualTo("VAT");
        assertThat(result.getTaxName()).isEqualTo("Value Added Tax");
        verify(ruleRepository).save(rule);
    }

    @Test
    @DisplayName("getAllRules returns the list from repository")
    void getAllRulesReturnsList() {
        TaxRule rule1 = TaxRule.builder().id(1L).taxCode("VAT").taxName("VAT").taxType("INDIRECT")
                .taxRate(new BigDecimal("15.0000")).appliesTo("PAYMENT").build();
        TaxRule rule2 = TaxRule.builder().id(2L).taxCode("WHT").taxName("Withholding Tax").taxType("DIRECT")
                .taxRate(new BigDecimal("10.0000")).appliesTo("INTEREST").build();

        when(ruleRepository.findAll()).thenReturn(List.of(rule1, rule2));

        List<TaxRule> result = service.getAllRules();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTaxCode()).isEqualTo("VAT");
        assertThat(result.get(1).getTaxCode()).isEqualTo("WHT");
    }

    @Test
    @DisplayName("previewTax returns applicable taxes with correct amounts")
    void previewTaxReturnsCorrectAmounts() {
        TaxRule vatRule = TaxRule.builder()
                .taxCode("VAT").taxName("Value Added Tax").taxType("INDIRECT")
                .taxRate(new BigDecimal("15.0000")).appliesTo("PAYMENT")
                .exemptCustomerTypes("").exemptProductCodes("")
                .build();

        when(ruleRepository.findApplicableRules(eq("PAYMENT"), any(LocalDate.class)))
                .thenReturn(List.of(vatRule));

        List<TaxService.TaxPreview> previews = service.previewTax("PAYMENT",
                new BigDecimal("1000.00"), "INDIVIDUAL", "SAV001");

        assertThat(previews).hasSize(1);
        assertThat(previews.get(0).taxCode()).isEqualTo("VAT");
        assertThat(previews.get(0).rate()).isEqualByComparingTo(new BigDecimal("15.0000"));
        assertThat(previews.get(0).amount()).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("previewTax skips exempt customer types")
    void previewTaxSkipsExemptCustomerTypes() {
        TaxRule vatRule = TaxRule.builder()
                .taxCode("VAT").taxName("Value Added Tax").taxType("INDIRECT")
                .taxRate(new BigDecimal("15.0000")).appliesTo("PAYMENT")
                .exemptCustomerTypes("GOVERNMENT,NGO").exemptProductCodes("")
                .build();

        when(ruleRepository.findApplicableRules(eq("PAYMENT"), any(LocalDate.class)))
                .thenReturn(List.of(vatRule));

        List<TaxService.TaxPreview> previews = service.previewTax("PAYMENT",
                new BigDecimal("1000.00"), "GOVERNMENT", "SAV001");

        assertThat(previews).isEmpty();
    }

    @Test
    @DisplayName("previewTax skips rules below threshold amount")
    void previewTaxSkipsBelowThreshold() {
        TaxRule rule = TaxRule.builder()
                .taxCode("STAMP").taxName("Stamp Duty").taxType("DUTY")
                .taxRate(new BigDecimal("0.5000")).appliesTo("TRANSFER")
                .thresholdAmount(new BigDecimal("5000.00"))
                .exemptCustomerTypes("").exemptProductCodes("")
                .build();

        when(ruleRepository.findApplicableRules(eq("TRANSFER"), any(LocalDate.class)))
                .thenReturn(List.of(rule));

        List<TaxService.TaxPreview> previews = service.previewTax("TRANSFER",
                new BigDecimal("2000.00"), "INDIVIDUAL", "SAV001");

        assertThat(previews).isEmpty();
    }

    @Test
    @DisplayName("getAccountTaxHistory delegates to repository")
    void getAccountTaxHistoryDelegatesToRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        TaxTransaction txn = TaxTransaction.builder()
                .id(1L).taxCode("VAT").accountId(100L)
                .baseAmount(new BigDecimal("1000.00"))
                .taxAmount(new BigDecimal("150.00"))
                .build();
        Page<TaxTransaction> page = new PageImpl<>(List.of(txn));

        when(txnRepository.findByAccountIdOrderByCreatedAtDesc(100L, pageable)).thenReturn(page);

        Page<TaxTransaction> result = service.getAccountTaxHistory(100L, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getTaxCode()).isEqualTo("VAT");
        verify(txnRepository).findByAccountIdOrderByCreatedAtDesc(100L, pageable);
    }

    @Test
    @DisplayName("getPendingRemittance delegates to repository with DEDUCTED status")
    void getPendingRemittanceDelegatesToRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        TaxTransaction txn = TaxTransaction.builder()
                .id(1L).taxCode("WHT").status("DEDUCTED")
                .baseAmount(new BigDecimal("5000.00"))
                .taxAmount(new BigDecimal("500.00"))
                .build();
        Page<TaxTransaction> page = new PageImpl<>(List.of(txn));

        when(txnRepository.findByStatusOrderByCreatedAtDesc("DEDUCTED", pageable)).thenReturn(page);

        Page<TaxTransaction> result = service.getPendingRemittance(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getStatus()).isEqualTo("DEDUCTED");
        verify(txnRepository).findByStatusOrderByCreatedAtDesc("DEDUCTED", pageable);
    }
}
