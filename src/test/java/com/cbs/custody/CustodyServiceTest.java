package com.cbs.custody;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.custody.entity.CustodyAccount;
import com.cbs.custody.repository.CustodyAccountRepository;
import com.cbs.custody.service.CustodyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CustodyServiceTest {

    @Mock private CustodyAccountRepository custodyRepository;
    @Mock private CurrentActorProvider currentActorProvider;
    @InjectMocks private CustodyService service;

    @Test
    @DisplayName("Account opening generates code and sets opened timestamp")
    void openSetsCodeAndTimestamp() {
        CustodyAccount account = new CustodyAccount();
        account.setAccountName("Global Custody");
        account.setCustomerId(1L);
        account.setAccountType("INSTITUTIONAL");

        when(custodyRepository.findByCustomerIdAndStatusOrderByAccountNameAsc(1L, "ACTIVE"))
                .thenReturn(List.of());
        when(custodyRepository.save(any())).thenAnswer(inv -> {
            CustodyAccount saved = inv.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        CustodyAccount result = service.open(account);

        assertThat(result.getAccountCode()).startsWith("CUS-");
        assertThat(result.getOpenedAt()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }
}
