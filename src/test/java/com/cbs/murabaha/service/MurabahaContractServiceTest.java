package com.cbs.murabaha.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MurabahaContractServiceTest {

    @Mock
    private MurabahaContractRepository contractRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock
    private AccountService accountService;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private IslamicPostingRuleService postingRuleService;
    @Mock
    private MurabahaScheduleService scheduleService;
    @Mock
    private MurabahaProfitRecognitionService profitRecognitionService;
    @Mock
    private PoolAssetManagementService poolAssetManagementService;

    @InjectMocks
    private MurabahaContractService service;

    @Test
    void executeContract_withoutOwnershipVerification_rejected() {
        MurabahaContract contract = MurabahaContract.builder()
                .id(1L)
                .contractRef("MRB-FIN-2026-000001")
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .ownershipVerified(false)
                .costPrice(new BigDecimal("100000"))
                .markupRate(new BigDecimal("10"))
                .sellingPrice(new BigDecimal("110000"))
                .status(MurabahaDomainEnums.ContractStatus.DRAFT)
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThrows(BusinessException.class, () -> service.executeContract(1L, "officer"));
    }
}
