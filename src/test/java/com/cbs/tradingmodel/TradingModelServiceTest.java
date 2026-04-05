package com.cbs.tradingmodel;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tradingmodel.entity.TradingModel;
import com.cbs.tradingmodel.repository.TradingModelRepository;
import com.cbs.tradingmodel.service.TradingModelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Objects;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TradingModelServiceTest {

    @Mock
    private TradingModelRepository modelRepository;

    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks
    private TradingModelService service;

    @Test
    @DisplayName("registerModel assigns TM- prefixed code and sets DEVELOPMENT status")
    void registerModelSetsCodeAndStatus() {
        TradingModel model = new TradingModel();
        model.setModelName("Black-Scholes Option Pricer");
        model.setModelPurpose("PRICING");
        model.setInstrumentScope("OPTION");
        model.setModelVersion("1.0.0");

        when(modelRepository.save(any(TradingModel.class))).thenAnswer(i -> {
            TradingModel saved = Objects.requireNonNull(i.getArgument(0, TradingModel.class));
            saved.setId(1L);
            return saved;
        });

        TradingModel result = service.registerModel(model);

        assertThat(result.getModelCode()).startsWith("TM-");
        assertThat(result.getModelCode()).hasSize(13); // "TM-" + 10 chars
        assertThat(result.getStatus()).isEqualTo("DEVELOPMENT");
    }

    @Test
    @DisplayName("deployToProduction throws BusinessException when validationResult is not APPROVED")
    void deployToProductionRequiresApproval() {
        TradingModel model = new TradingModel();
        model.setId(1L);
        model.setModelCode("TM-ABC1234567");
        model.setStatus("VALIDATION");
        model.setValidationResult("FAILED");

        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));

        assertThatThrownBy(() -> service.deployToProduction(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("APPROVED");
    }

    @Test
    @DisplayName("deployToProduction succeeds and sets PRODUCTION status when validationResult is APPROVED")
    void deployToProductionSucceedsWhenApproved() {
        TradingModel model = new TradingModel();
        model.setId(2L);
        model.setModelCode("TM-DEF9876543");
        model.setStatus("VALIDATION");
        model.setValidationResult("APPROVED");

        when(modelRepository.findById(2L)).thenReturn(Optional.of(model));
        when(modelRepository.save(any(TradingModel.class))).thenAnswer(i -> Objects.requireNonNull(i.getArgument(0, TradingModel.class)));

        TradingModel result = service.deployToProduction(2L);

        assertThat(result.getStatus()).isEqualTo("PRODUCTION");
        assertThat(result.getProductionDeployedAt()).isNotNull();
    }

    @Test
    @DisplayName("retireModel sets status to RETIRED")
    void retireModelSetsRetiredStatus() {
        TradingModel model = new TradingModel();
        model.setId(3L);
        model.setModelCode("TM-GHI1122334");
        model.setStatus("PRODUCTION");

        when(modelRepository.findById(3L)).thenReturn(Optional.of(model));
        when(modelRepository.save(any(TradingModel.class))).thenAnswer(i -> Objects.requireNonNull(i.getArgument(0, TradingModel.class)));

        TradingModel result = service.retireModel(3L);

        assertThat(result.getStatus()).isEqualTo("RETIRED");
    }

    @Test
    @DisplayName("findModelOrThrow raises ResourceNotFoundException for unknown id")
    void submitForValidationThrowsForUnknownModel() {
        when(modelRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submitForValidation(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
