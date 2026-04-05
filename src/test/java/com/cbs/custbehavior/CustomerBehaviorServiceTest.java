package com.cbs.custbehavior;

import com.cbs.custbehavior.entity.CustomerBehaviorModel;
import com.cbs.custbehavior.repository.CustomerBehaviorModelRepository;
import com.cbs.custbehavior.service.CustomerBehaviorService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class CustomerBehaviorServiceTest {

    @Mock
    private CustomerBehaviorModelRepository repository;

    @Mock
    private com.cbs.common.audit.CurrentActorProvider currentActorProvider;

    @InjectMocks
    private CustomerBehaviorService service;

    @Test
    @DisplayName("Score ≥80 → VERY_HIGH band, score 30 → LOW band")
    void scoreAssignsCorrectBands() {
        CustomerBehaviorModel highModel = new CustomerBehaviorModel();
        highModel.setCustomerId(1L);
        highModel.setModelType("CHURN_PREDICTION");
        highModel.setModelVersion("1.0");
        highModel.setScore(new BigDecimal("85"));

        when(repository.findByCustomerIdAndModelTypeAndIsCurrentTrue(1L, "CHURN_PREDICTION"))
                .thenReturn(Optional.empty());
        when(repository.save(any(CustomerBehaviorModel.class))).thenAnswer(i -> i.getArgument(0));

        CustomerBehaviorModel resultHigh = service.score(highModel);
        assertThat(resultHigh.getScoreBand()).isEqualTo("VERY_HIGH");
        assertThat(resultHigh.getModelCode()).startsWith("CBM-");

        CustomerBehaviorModel lowModel = new CustomerBehaviorModel();
        lowModel.setCustomerId(2L);
        lowModel.setModelType("CREDIT_BEHAVIOR");
        lowModel.setModelVersion("1.0");
        lowModel.setScore(new BigDecimal("30"));

        when(repository.findByCustomerIdAndModelTypeAndIsCurrentTrue(2L, "CREDIT_BEHAVIOR"))
                .thenReturn(Optional.empty());

        CustomerBehaviorModel resultLow = service.score(lowModel);
        assertThat(resultLow.getScoreBand()).isEqualTo("LOW");
    }

    @Test
    @DisplayName("New model marks previous same-type model as isCurrent = false")
    void newModelMarksPreviousAsNotCurrent() {
        CustomerBehaviorModel previous = new CustomerBehaviorModel();
        previous.setId(10L);
        previous.setCustomerId(1L);
        previous.setModelType("CHURN_PREDICTION");
        previous.setIsCurrent(true);

        CustomerBehaviorModel newModel = new CustomerBehaviorModel();
        newModel.setCustomerId(1L);
        newModel.setModelType("CHURN_PREDICTION");
        newModel.setModelVersion("2.0");
        newModel.setScore(new BigDecimal("70"));

        when(repository.findByCustomerIdAndModelTypeAndIsCurrentTrue(1L, "CHURN_PREDICTION"))
                .thenReturn(Optional.of(previous));
        when(repository.save(any(CustomerBehaviorModel.class))).thenAnswer(i -> i.getArgument(0));

        service.score(newModel);

        assertThat(previous.getIsCurrent()).isFalse();
        verify(repository).save(previous);
    }
}
