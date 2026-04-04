package com.cbs.murabaha.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.murabaha.dto.ExecuteCustomerSaleRequest;
import com.cbs.murabaha.entity.CommodityMurabahaTrade;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.CommodityMurabahaTradeRepository;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommodityMurabahaServiceTest {

    @Mock
    private CommodityMurabahaTradeRepository tradeRepository;
    @Mock
    private MurabahaContractRepository contractRepository;
    @Mock
    private IslamicPostingRuleService postingRuleService;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private AccountPostingService accountPostingService;

    @InjectMocks
    private CommodityMurabahaService service;

    @Test
    void executeCustomerSale_withSameBroker_rejected() {
        CommodityMurabahaTrade trade = CommodityMurabahaTrade.builder()
                .id(1L)
                .contractId(10L)
                .purchaseBrokerId(99L)
                .purchaseBrokerName("Broker A")
                .build();

        when(tradeRepository.findById(1L)).thenReturn(Optional.of(trade));

        ExecuteCustomerSaleRequest request = ExecuteCustomerSaleRequest.builder()
                .customerSaleBrokerId(99L)
                .customerSaleBrokerName("Broker A")
                .customerSaleOrderRef("ORD-1")
                .customerSaleDate(LocalDate.now())
                .customerSalePrice(new BigDecimal("100000"))
                .creditedAccountId(77L)
                .build();

        assertThrows(BusinessException.class, () -> service.executeCustomerSale(1L, request));
    }
}
