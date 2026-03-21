package com.cbs.merchant.mapper;

import com.cbs.merchant.dto.ChargebackResponse;
import com.cbs.merchant.dto.FacilityResponse;
import com.cbs.merchant.dto.RecordChargebackRequest;
import com.cbs.merchant.dto.SettlementResponse;
import com.cbs.merchant.dto.SetupFacilityRequest;
import com.cbs.merchant.entity.AcquiringFacility;
import com.cbs.merchant.entity.MerchantChargeback;
import com.cbs.merchant.entity.MerchantSettlement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-21T22:35:43+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class AcquiringMapperImpl implements AcquiringMapper {

    @Override
    public AcquiringFacility toEntity(SetupFacilityRequest request) {
        if ( request == null ) {
            return null;
        }

        AcquiringFacility.AcquiringFacilityBuilder<?, ?> acquiringFacility = AcquiringFacility.builder();

        acquiringFacility.merchantId( request.getMerchantId() );
        acquiringFacility.facilityType( request.getFacilityType() );
        acquiringFacility.processorConnection( request.getProcessorConnection() );
        acquiringFacility.terminalIdPrefix( request.getTerminalIdPrefix() );
        acquiringFacility.settlementCurrency( request.getSettlementCurrency() );
        acquiringFacility.settlementCycle( request.getSettlementCycle() );
        acquiringFacility.mdrRatePct( request.getMdrRatePct() );
        acquiringFacility.dailyTransactionLimit( request.getDailyTransactionLimit() );
        acquiringFacility.monthlyVolumeLimit( request.getMonthlyVolumeLimit() );
        acquiringFacility.chargebackLimitPct( request.getChargebackLimitPct() );
        acquiringFacility.reserveHoldPct( request.getReserveHoldPct() );

        return acquiringFacility.build();
    }

    @Override
    public FacilityResponse toFacilityResponse(AcquiringFacility entity) {
        if ( entity == null ) {
            return null;
        }

        FacilityResponse.FacilityResponseBuilder facilityResponse = FacilityResponse.builder();

        facilityResponse.id( entity.getId() );
        facilityResponse.merchantId( entity.getMerchantId() );
        facilityResponse.facilityType( entity.getFacilityType() );
        facilityResponse.processorConnection( entity.getProcessorConnection() );
        facilityResponse.terminalIdPrefix( entity.getTerminalIdPrefix() );
        facilityResponse.settlementCurrency( entity.getSettlementCurrency() );
        facilityResponse.settlementCycle( entity.getSettlementCycle() );
        facilityResponse.mdrRatePct( entity.getMdrRatePct() );
        facilityResponse.dailyTransactionLimit( entity.getDailyTransactionLimit() );
        facilityResponse.monthlyVolumeLimit( entity.getMonthlyVolumeLimit() );
        facilityResponse.chargebackLimitPct( entity.getChargebackLimitPct() );
        facilityResponse.reserveHoldPct( entity.getReserveHoldPct() );
        facilityResponse.reserveBalance( entity.getReserveBalance() );
        facilityResponse.pciComplianceStatus( entity.getPciComplianceStatus() );
        facilityResponse.pciComplianceDate( entity.getPciComplianceDate() );
        facilityResponse.fraudScreeningEnabled( entity.getFraudScreeningEnabled() );
        facilityResponse.threeDSecureEnabled( entity.getThreeDSecureEnabled() );
        facilityResponse.status( entity.getStatus() );
        facilityResponse.createdAt( entity.getCreatedAt() );
        facilityResponse.updatedAt( entity.getUpdatedAt() );

        return facilityResponse.build();
    }

    @Override
    public List<FacilityResponse> toFacilityResponseList(List<AcquiringFacility> entities) {
        if ( entities == null ) {
            return null;
        }

        List<FacilityResponse> list = new ArrayList<FacilityResponse>( entities.size() );
        for ( AcquiringFacility acquiringFacility : entities ) {
            list.add( toFacilityResponse( acquiringFacility ) );
        }

        return list;
    }

    @Override
    public SettlementResponse toSettlementResponse(MerchantSettlement entity) {
        if ( entity == null ) {
            return null;
        }

        SettlementResponse.SettlementResponseBuilder settlementResponse = SettlementResponse.builder();

        settlementResponse.id( entity.getId() );
        settlementResponse.merchantId( entity.getMerchantId() );
        settlementResponse.facilityId( entity.getFacilityId() );
        settlementResponse.settlementDate( entity.getSettlementDate() );
        settlementResponse.grossTransactionAmount( entity.getGrossTransactionAmount() );
        settlementResponse.transactionCount( entity.getTransactionCount() );
        settlementResponse.mdrDeducted( entity.getMdrDeducted() );
        settlementResponse.otherFeesDeducted( entity.getOtherFeesDeducted() );
        settlementResponse.chargebackDeductions( entity.getChargebackDeductions() );
        settlementResponse.refundDeductions( entity.getRefundDeductions() );
        settlementResponse.reserveHeld( entity.getReserveHeld() );
        settlementResponse.netSettlementAmount( entity.getNetSettlementAmount() );
        settlementResponse.settlementAccountId( entity.getSettlementAccountId() );
        settlementResponse.settlementReference( entity.getSettlementReference() );
        settlementResponse.settledAt( entity.getSettledAt() );
        settlementResponse.status( entity.getStatus() );
        settlementResponse.createdAt( entity.getCreatedAt() );
        settlementResponse.updatedAt( entity.getUpdatedAt() );

        return settlementResponse.build();
    }

    @Override
    public List<SettlementResponse> toSettlementResponseList(List<MerchantSettlement> entities) {
        if ( entities == null ) {
            return null;
        }

        List<SettlementResponse> list = new ArrayList<SettlementResponse>( entities.size() );
        for ( MerchantSettlement merchantSettlement : entities ) {
            list.add( toSettlementResponse( merchantSettlement ) );
        }

        return list;
    }

    @Override
    public MerchantChargeback toEntity(RecordChargebackRequest request) {
        if ( request == null ) {
            return null;
        }

        MerchantChargeback.MerchantChargebackBuilder<?, ?> merchantChargeback = MerchantChargeback.builder();

        merchantChargeback.merchantId( request.getMerchantId() );
        merchantChargeback.originalTransactionRef( request.getOriginalTransactionRef() );
        merchantChargeback.transactionDate( request.getTransactionDate() );
        merchantChargeback.transactionAmount( request.getTransactionAmount() );
        merchantChargeback.cardNetwork( request.getCardNetwork() );
        merchantChargeback.reasonCode( request.getReasonCode() );
        merchantChargeback.reasonDescription( request.getReasonDescription() );
        merchantChargeback.chargebackAmount( request.getChargebackAmount() );
        merchantChargeback.currency( request.getCurrency() );
        merchantChargeback.evidenceDeadline( request.getEvidenceDeadline() );

        return merchantChargeback.build();
    }

    @Override
    public ChargebackResponse toChargebackResponse(MerchantChargeback entity) {
        if ( entity == null ) {
            return null;
        }

        ChargebackResponse.ChargebackResponseBuilder chargebackResponse = ChargebackResponse.builder();

        chargebackResponse.id( entity.getId() );
        chargebackResponse.merchantId( entity.getMerchantId() );
        chargebackResponse.originalTransactionRef( entity.getOriginalTransactionRef() );
        chargebackResponse.transactionDate( entity.getTransactionDate() );
        chargebackResponse.transactionAmount( entity.getTransactionAmount() );
        chargebackResponse.cardNetwork( entity.getCardNetwork() );
        chargebackResponse.reasonCode( entity.getReasonCode() );
        chargebackResponse.reasonDescription( entity.getReasonDescription() );
        chargebackResponse.chargebackAmount( entity.getChargebackAmount() );
        chargebackResponse.currency( entity.getCurrency() );
        chargebackResponse.evidenceDeadline( entity.getEvidenceDeadline() );
        chargebackResponse.merchantResponseRef( entity.getMerchantResponseRef() );
        Map<String, Object> map = entity.getMerchantEvidence();
        if ( map != null ) {
            chargebackResponse.merchantEvidence( new LinkedHashMap<String, Object>( map ) );
        }
        chargebackResponse.representmentSubmitted( entity.getRepresentmentSubmitted() );
        chargebackResponse.arbitrationRequired( entity.getArbitrationRequired() );
        chargebackResponse.outcome( entity.getOutcome() );
        chargebackResponse.financialImpact( entity.getFinancialImpact() );
        chargebackResponse.status( entity.getStatus() );
        chargebackResponse.createdAt( entity.getCreatedAt() );
        chargebackResponse.updatedAt( entity.getUpdatedAt() );

        return chargebackResponse.build();
    }

    @Override
    public List<ChargebackResponse> toChargebackResponseList(List<MerchantChargeback> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ChargebackResponse> list = new ArrayList<ChargebackResponse>( entities.size() );
        for ( MerchantChargeback merchantChargeback : entities ) {
            list.add( toChargebackResponse( merchantChargeback ) );
        }

        return list;
    }
}
