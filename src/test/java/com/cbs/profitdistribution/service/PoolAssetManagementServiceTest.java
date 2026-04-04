package com.cbs.profitdistribution.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolParticipantRepository;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.profitdistribution.dto.AssignAssetToPoolRequest;
import com.cbs.profitdistribution.dto.PoolAssetAssignmentResponse;
import com.cbs.profitdistribution.dto.PoolIncomeRecordResponse;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.dto.SegregationValidationResult;
import com.cbs.profitdistribution.entity.AssignmentStatus;
import com.cbs.profitdistribution.entity.PoolAssetAssignment;
import com.cbs.profitdistribution.repository.PoolAssetAssignmentRepository;
import com.cbs.profitdistribution.repository.PoolExpenseRecordRepository;
import com.cbs.profitdistribution.repository.PoolIncomeRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PoolAssetManagementServiceTest {

    @Mock
    private PoolAssetAssignmentRepository assetRepo;

    @Mock
    private PoolIncomeRecordRepository incomeRepo;

    @Mock
    private PoolExpenseRecordRepository expenseRepo;

    @Mock
    private InvestmentPoolRepository poolRepo;

    @Mock
    private InvestmentPoolParticipantRepository participantRepo;

    @Mock
    private CurrentActorProvider actorProvider;

    @InjectMocks
    private PoolAssetManagementService service;

    private InvestmentPool activePool;

    @BeforeEach
    void setUp() {
        activePool = InvestmentPool.builder()
                .id(1L)
                .poolCode("POOL-001")
                .name("General Investment Pool")
                .poolType(com.cbs.gl.islamic.entity.PoolType.UNRESTRICTED)
                .currencyCode("SAR")
                .totalPoolBalance(new BigDecimal("1000000"))
                .profitSharingRatioBank(new BigDecimal("40"))
                .profitSharingRatioInvestors(new BigDecimal("60"))
                .status(PoolStatus.ACTIVE)
                .build();
    }

    // ── Asset Assignment Tests ─────────────────────────────────────────

    @Test
    void assignAssetToPool_success() {
        Long poolId = 1L;
        Long assetRefId = 100L;

        AssignAssetToPoolRequest request = AssignAssetToPoolRequest.builder()
                .poolId(poolId)
                .assetType("MURABAHA_FINANCING")
                .assetReferenceId(assetRefId)
                .assetReferenceCode("MUR-001")
                .assetDescription("Murabaha financing contract")
                .assignedAmount(new BigDecimal("500000"))
                .currentOutstanding(new BigDecimal("1000000"))
                .currencyCode("SAR")
                .build();

        when(poolRepo.findById(poolId)).thenReturn(Optional.of(activePool));
        when(assetRepo.findByAssetReferenceId(assetRefId)).thenReturn(Collections.emptyList());
        when(assetRepo.save(any(PoolAssetAssignment.class))).thenAnswer(invocation -> {
            PoolAssetAssignment saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        PoolAssetAssignmentResponse response = service.assignAssetToPool(poolId, request);

        assertNotNull(response);
        assertEquals(poolId, response.getPoolId());
        assertEquals(new BigDecimal("500000"), response.getAssignedAmount());
        assertEquals(AssignmentStatus.ACTIVE, response.getAssignmentStatus());
        verify(assetRepo).save(any(PoolAssetAssignment.class));
    }

    @Test
    void assignAssetToPool_overAssigned_rejected() {
        Long poolId = 1L;
        Long assetRefId = 100L;

        // Existing assignment already uses 800,000 of the 1,000,000 outstanding
        PoolAssetAssignment existing = PoolAssetAssignment.builder()
                .id(5L)
                .poolId(2L)
                .assignedAmount(new BigDecimal("800000"))
                .currentOutstanding(new BigDecimal("1000000"))
                .assignmentStatus(AssignmentStatus.ACTIVE)
                .build();

        AssignAssetToPoolRequest request = AssignAssetToPoolRequest.builder()
                .poolId(poolId)
                .assetType("MURABAHA_FINANCING")
                .assetReferenceId(assetRefId)
                .assignedAmount(new BigDecimal("300000")) // 800k + 300k = 1.1M > 1M outstanding
                .currentOutstanding(new BigDecimal("1000000"))
                .currencyCode("SAR")
                .build();

        when(poolRepo.findById(poolId)).thenReturn(Optional.of(activePool));
        when(assetRepo.findByAssetReferenceId(assetRefId)).thenReturn(List.of(existing));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.assignAssetToPool(poolId, request));

        assertTrue(ex.getMessage().contains("Asset over-assigned"));
        verify(assetRepo, never()).save(any());
    }

    // ── Income Recording Tests ─────────────────────────────────────────

    @Test
    void recordIncome_latePaymentCharity_excluded() {
        Long poolId = 1L;

        RecordPoolIncomeRequest request = RecordPoolIncomeRequest.builder()
                .poolId(poolId)
                .incomeType("LATE_PAYMENT_CHARITY")
                .amount(new BigDecimal("10000"))
                .currencyCode("SAR")
                .incomeDate(LocalDate.of(2026, 3, 31))
                .periodFrom(LocalDate.of(2026, 3, 1))
                .periodTo(LocalDate.of(2026, 3, 31))
                .build();

        when(poolRepo.findById(poolId)).thenReturn(Optional.of(activePool));
        when(actorProvider.getCurrentActor()).thenReturn("system-user");
        when(incomeRepo.save(any())).thenAnswer(invocation -> {
            var saved = invocation.getArgument(0);
            return saved;
        });

        PoolIncomeRecordResponse response = service.recordIncome(poolId, request);

        assertNotNull(response);
        assertTrue(response.isCharityIncome());
        verify(incomeRepo).save(any());
    }

    // ── Segregation Validation Tests ───────────────────────────────────

    @Test
    void validateSegregation_balanced_passes() {
        Long poolId = 1L;

        when(poolRepo.findById(poolId)).thenReturn(Optional.of(activePool));
        when(assetRepo.sumAssignedAmountByPoolId(poolId)).thenReturn(new BigDecimal("1000000"));
        when(participantRepo.sumParticipationBalanceByPoolId(poolId)).thenReturn(new BigDecimal("1000000"));
        when(assetRepo.findByPoolIdAndAssignmentStatus(poolId, AssignmentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        SegregationValidationResult result = service.validatePoolSegregation(poolId);

        assertTrue(result.isSegregated());
        assertEquals(BigDecimal.ZERO.compareTo(result.getMismatchAmount()), 0);
        assertFalse(result.isHasOverAssignedAssets());
    }

    @Test
    void validateSegregation_mismatch_flagged() {
        Long poolId = 1L;

        // Assets significantly exceed liabilities (>5% mismatch)
        BigDecimal totalAssets = new BigDecimal("1200000");
        BigDecimal totalLiabilities = new BigDecimal("1000000");

        when(poolRepo.findById(poolId)).thenReturn(Optional.of(activePool));
        when(assetRepo.sumAssignedAmountByPoolId(poolId)).thenReturn(totalAssets);
        when(participantRepo.sumParticipationBalanceByPoolId(poolId)).thenReturn(totalLiabilities);
        when(assetRepo.findByPoolIdAndAssignmentStatus(poolId, AssignmentStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        SegregationValidationResult result = service.validatePoolSegregation(poolId);

        assertFalse(result.isSegregated());
        assertTrue(result.getMismatchAmount().compareTo(BigDecimal.ZERO) > 0);
        // Mismatch is 200k/1.2M = 16.67%, well above 5% threshold
        assertTrue(result.getMismatchPercentage().compareTo(new BigDecimal("5")) > 0);
    }
}
