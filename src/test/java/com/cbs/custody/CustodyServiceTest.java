package com.cbs.custody;

import com.cbs.custody.entity.CustodyAccount;
import com.cbs.custody.repository.CustodyAccountRepository;
import com.cbs.custody.service.CustodyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustodyServiceTest {

    @Mock private CustodyAccountRepository custodyRepository;
    @InjectMocks private CustodyService service;

    @Test
    @DisplayName("Account opening generates code and sets opened timestamp")
    void openSetsCodeAndTimestamp() {
        CustodyAccount account = new CustodyAccount();
        account.setAccountName("Global Custody");
        account.setCustomerId(1L);
        account.setAccountType("GLOBAL_CUSTODY");

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
