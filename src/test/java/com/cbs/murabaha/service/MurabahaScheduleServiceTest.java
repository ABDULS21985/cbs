package com.cbs.murabaha.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.murabaha.dto.EarlySettlementQuote;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.murabaha.repository.MurabahaInstallmentRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MurabahaScheduleServiceTest {

    @Mock
    private MurabahaContractRepository contractRepository;
    @Mock
    private MurabahaInstallmentRepository installmentRepository;
    @Mock
    private HijriCalendarService hijriCalendarService;
    @Mock
    private IslamicPostingRuleService postingRuleService;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private PoolAssetManagementService poolAssetManagementService;

    @InjectMocks
    private MurabahaScheduleService service;

    private MurabahaContract contract;

    @BeforeEach
    void setUp() {
        contract = MurabahaContract.builder()
                .id(1L)
                .contractRef("MRB-001")
                .costPrice(new BigDecimal("1000.00"))
                .downPayment(BigDecimal.ZERO)
                .markupAmount(new BigDecimal("200.00"))
                .sellingPrice(new BigDecimal("1200.00"))
                .financedAmount(new BigDecimal("1200.00"))
                .tenorMonths(4)
                .startDate(LocalDate.of(2026, 1, 1))
                .firstInstallmentDate(LocalDate.of(2026, 2, 1))
                .repaymentFrequency(MurabahaDomainEnums.RepaymentFrequency.MONTHLY)
                .profitRecognitionMethod(MurabahaDomainEnums.ProfitRecognitionMethod.PROPORTIONAL_TO_TIME)
                .unrecognisedProfit(new BigDecimal("120.00"))
                .earlySettlementRebateMethod(MurabahaDomainEnums.EarlySettlementRebateMethod.IBRA_MANDATORY)
                .status(MurabahaDomainEnums.ContractStatus.ACTIVE)
                .build();
    }

    @Test
    void generateSchedule_conservesPrincipalAndProfit() {
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(installmentRepository.findByContractIdOrderByInstallmentNumberAsc(1L)).thenReturn(new ArrayList<>());
        when(installmentRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(hijriCalendarService.isIslamicBusinessDay(any())).thenReturn(true);
        when(hijriCalendarService.toHijri(any())).thenReturn(HijriDateResponse.builder()
                .hijriYear(1447).hijriMonth(8).hijriDay(1).build());

        List<MurabahaInstallment> schedule = service.generateSchedule(1L);

        assertEquals(4, schedule.size());
        assertEquals(0, new BigDecimal("1000.00").compareTo(schedule.stream()
                .map(MurabahaInstallment::getPrincipalComponent)
                .reduce(BigDecimal.ZERO, BigDecimal::add)));
        assertEquals(0, new BigDecimal("200.00").compareTo(schedule.stream()
                .map(MurabahaInstallment::getProfitComponent)
                .reduce(BigDecimal.ZERO, BigDecimal::add)));
        assertEquals(0, new BigDecimal("1200.00").compareTo(schedule.stream()
                .map(MurabahaInstallment::getTotalInstallmentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)));
    }

    @Test
    void calculateEarlySettlement_withMandatoryIbra_waivesUnrecognisedProfit() {
        MurabahaInstallment remaining = MurabahaInstallment.builder()
                .contractId(1L)
                .installmentNumber(2)
                .principalComponent(new BigDecimal("400.00"))
                .profitComponent(new BigDecimal("120.00"))
                .totalInstallmentAmount(new BigDecimal("520.00"))
                .paidPrincipal(BigDecimal.ZERO)
                .paidProfit(BigDecimal.ZERO)
                .status(MurabahaDomainEnums.InstallmentStatus.SCHEDULED)
                .build();

        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(any(), any()))
                .thenReturn(List.of(remaining));

        EarlySettlementQuote quote = service.calculateEarlySettlement(1L, LocalDate.of(2026, 2, 15));

        assertEquals(0, new BigDecimal("120.00").compareTo(quote.getIbraAmount()));
        assertEquals(0, new BigDecimal("400.00").compareTo(quote.getSettlementAmount()));
    }
}
