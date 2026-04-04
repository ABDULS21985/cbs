package com.cbs.gl.islamic;

import com.cbs.audit.service.AuditService;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.entity.ShariahClassification;
import com.cbs.gl.islamic.service.IslamicGLMetadataService;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicGLMetadataServiceTest {

    @Mock private ChartOfAccountsRepository coaRepository;
    @Mock private GlBalanceRepository glBalanceRepository;
    @Mock private InvestmentPoolRepository investmentPoolRepository;
    @Mock private AuditService auditService;

    @InjectMocks private IslamicGLMetadataService service;

    @Test
    @DisplayName("resolve financing receivable account for Murabaha")
    void resolveFinancingReceivableAccount_murabaha() {
        ChartOfAccounts account = ChartOfAccounts.builder()
                .glCode("1200-MRB-001")
                .isActive(true)
                .build();
        when(coaRepository.findByIslamicAccountCategoryOrderByGlCodeAsc(IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA))
                .thenReturn(List.of(account));

        String glCode = service.resolveFinancingReceivableAccount("MURABAHA", "USD");

        assertThat(glCode).isEqualTo("1200-MRB-001");
    }

    @Test
    @DisplayName("resolve income account for Ijarah")
    void resolveIncomeAccount_ijarah() {
        ChartOfAccounts account = ChartOfAccounts.builder()
                .glCode("5100-IJR-001")
                .isActive(true)
                .build();
        when(coaRepository.findByIslamicAccountCategoryOrderByGlCodeAsc(IslamicAccountCategory.IJARAH_INCOME))
                .thenReturn(List.of(account));

        String glCode = service.resolveIncomeAccount("IJARAH");

        assertThat(glCode).isEqualTo("5100-IJR-001");
    }

    @Test
    @DisplayName("Shariah classification update triggers audit trail")
    void updateShariahClassification_audits() {
        ChartOfAccounts account = ChartOfAccounts.builder()
                .id(10L)
                .glCode("5600-000-001")
                .glCategory(GlCategory.INCOME)
                .normalBalance(NormalBalance.CREDIT)
                .build();
        when(coaRepository.findByGlCode("5600-000-001")).thenReturn(Optional.of(account));
        when(coaRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateShariahClassification("5600-000-001", ShariahClassification.UNDER_REVIEW, "shariah-reviewer");

        assertThat(account.getShariahClassification()).isEqualTo(ShariahClassification.UNDER_REVIEW);
        verify(auditService).log(org.mockito.ArgumentMatchers.eq("ChartOfAccounts"), org.mockito.ArgumentMatchers.eq(10L),
                any(), org.mockito.ArgumentMatchers.eq("shariah-reviewer"), contains("5600-000-001"));
    }

    @Test
    @DisplayName("get Zakat applicable accounts returns only flagged accounts")
    void getZakatApplicableAccounts_returnsOnlyFlagged() {
        ChartOfAccounts zakatable = ChartOfAccounts.builder().glCode("1200-MRB-001").build();
        when(coaRepository.findByZakatApplicableTrueAndIsActiveTrueOrderByGlCodeAsc()).thenReturn(List.of(zakatable));

        List<ChartOfAccounts> result = service.getZakatApplicableAccounts();

        assertThat(result).containsExactly(zakatable);
    }
}
