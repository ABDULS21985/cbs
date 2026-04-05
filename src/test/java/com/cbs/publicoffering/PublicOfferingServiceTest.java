package com.cbs.publicoffering;
import com.cbs.publicoffering.entity.PublicOfferingDetail;
import com.cbs.publicoffering.repository.PublicOfferingDetailRepository;
import com.cbs.publicoffering.service.PublicOfferingService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicOfferingServiceTest {
    @Mock private PublicOfferingDetailRepository repository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private PublicOfferingService service;

    @Test @DisplayName("Close applications rejects if already closed past close date")
    void closeRejectsAfterCloseDate() {
        PublicOfferingDetail detail = new PublicOfferingDetail();
        detail.setId(1L); detail.setStatus("OPEN");
        detail.setApplicationCloseDate(LocalDate.now().minusDays(1));
        when(repository.findById(1L)).thenReturn(Optional.of(detail));

        assertThatThrownBy(() -> service.closeApplications(1L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("already closed");
    }

    @Test @DisplayName("Record allotment sets basis and ALLOTTED status")
    void recordAllotmentSetsBasis() {
        PublicOfferingDetail detail = new PublicOfferingDetail();
        detail.setId(1L); detail.setStatus("CLOSED");
        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        PublicOfferingDetail result = service.recordAllotment(1L, "Pro-rata based on subscription amount");

        assertThat(result.getStatus()).isEqualTo("ALLOTTED");
        assertThat(result.getBasisOfAllotment()).isEqualTo("Pro-rata based on subscription amount");
    }
}
