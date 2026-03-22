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
    date = "2026-03-22T19:43:07+0100",
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

        acquiringFacility.chargebackLimitPct( request.getChargebackLimitPct() );
        acquiringFacility.dailyTransactionLimit( request.getDailyTransactionLimit() );
        acquiringFacility.facilityType( request.getFacilityType() );
        acquiringFacility.mdrRatePct( request.getMdrRatePct() );
        acquiringFacility.merchantId( request.getMerchantId() );
        acquiringFacility.monthlyVolumeLimit( request.getMonthlyVolumeLimit() );
        acquiringFacility.processorConnection( request.getProcessorConnection() );
        acquiringFacility.reserveHoldPct( request.getReserveHoldPct() );
        acquiringFacility.settlementCurrency( request.getSettlementCurrency() );
        acquiringFacility.settlementCycle( request.getSettlementCycle() );
        acquiringFacility.terminalIdPrefix( request.getTerminalIdPrefix() );

        return acquiringFacility.build();
    }

    @Override
    public FacilityResponse toFacilityResponse(AcquiringFacility entity) {
        if ( entity == null ) {
            return null;
        }

        FacilityResponse.FacilityResponseBuilder facilityResponse = FacilityResponse.builder();

        facilityResponse.chargebackLimitPct( entity.getChargebackLimitPct() );
        facilityResponse.createdAt( entity.getCreatedAt() );
        facilityResponse.dailyTransactionLimit( entity.getDailyTransactionLimit() );
        facilityResponse.facilityType( entity.getFacilityType() );
        facilityResponse.fraudScreeningEnabled( entity.getFraudScreeningEnabled() );
        facilityResponse.id( entity.getId() );
        facilityResponse.mdrRatePct( entity.getMdrRatePct() );
        facilityResponse.merchantId( entity.getMerchantId() );
        facilityResponse.monthlyVolumeLimit( entity.getMonthlyVolumeLimit() );
        facilityResponse.pciComplianceDate( entity.getPciComplianceDate() );
        facilityResponse.pciComplianceStatus( entity.getPciComplianceStatus() );
        facilityResponse.processorConnection( entity.getProcessorConnection() );
        facilityResponse.reserveBalance( entity.getReserveBalance() );
        facilityResponse.reserveHoldPct( entity.getReserveHoldPct() );
        facilityResponse.settlementCurrency( entity.getSettlementCurrency() );
        facilityResponse.settlementCycle( entity.getSettlementCycle() );
        facilityResponse.status( entity.getStatus() );
        facilityResponse.terminalIdPrefix( entity.getTerminalIdPrefix() );
        facilityResponse.threeDSecureEnabled( entity.getThreeDSecureEnabled() );
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

        settlementResponse.chargebackDeductions( entity.getChargebackDeductions() );
        settlementResponse.createdAt( entity.getCreatedAt() );
        settlementResponse.facilityId( entity.getFacilityId() );
        settlementResponse.grossTransactionAmount( entity.getGrossTransactionAmount() );
        settlementResponse.id( entity.getId() );
        settlementResponse.mdrDeducted( entity.getMdrDeducted() );
        settlementResponse.merchantId( entity.getMerchantId() );
        settlementResponse.netSettlementAmount( entity.getNetSettlementAmount() );
        settlementResponse.otherFeesDeducted( entity.getOtherFeesDeducted() );
        settlementResponse.refundDeductions( entity.getRefundDeductions() );
        settlementResponse.reserveHeld( entity.getReserveHeld() );
        settlementResponse.settledAt( entity.getSettledAt() );
        settlementResponse.settlementAccountId( entity.getSettlementAccountId() );
        settlementResponse.settlementDate( entity.getSettlementDate() );
        settlementResponse.settlementReference( entity.getSettlementReference() );
        settlementResponse.status( entity.getStatus() );
        settlementResponse.transactionCount( entity.getTransactionCount() );
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

        merchantChargeback.cardNetwork( request.getCardNetwork() );
        merchantChargeback.chargebackAmount( request.getChargebackAmount() );
        merchantChargeback.currency( request.getCurrency() );
        merchantChargeback.evidenceDeadline( request.getEvidenceDeadline() );
        merchantChargeback.merchantId( request.getMerchantId() );
        merchantChargeback.originalTransactionRef( request.getOriginalTransactionRef() );
        merchantChargeback.reasonCode( request.getReasonCode() );
        merchantChargeback.reasonDescription( request.getReasonDescription() );
        merchantChargeback.transactionAmount( request.getTransactionAmount() );
        merchantChargeback.transactionDate( request.getTransactionDate() );

        return merchantChargeback.build();
    }

    @Override
    public ChargebackResponse toChargebackResponse(MerchantChargeback entity) {
        if ( entity == null ) {
            return null;
        }

        ChargebackResponse.ChargebackResponseBuilder chargebackResponse = ChargebackResponse.builder();

        chargebackResponse.arbitrationRequired( entity.getArbitrationRequired() );
        chargebackResponse.cardNetwork( entity.getCardNetwork() );
        chargebackResponse.chargebackAmount( entity.getChargebackAmount() );
        chargebackResponse.createdAt( entity.getCreatedAt() );
        chargebackResponse.currency( entity.getCurrency() );
        chargebackResponse.evidenceDeadline( entity.getEvidenceDeadline() );
        chargebackResponse.financialImpact( entity.getFinancialImpact() );
        chargebackResponse.id( entity.getId() );
        Map<String, Object> map = entity.getMerchantEvidence();
        if ( map != null ) {
            chargebackResponse.merchantEvidence( new LinkedHashMap<String, Object>( map ) );
        }
        chargebackResponse.merchantId( entity.getMerchantId() );
        chargebackResponse.merchantResponseRef( entity.getMerchantResponseRef() );
        chargebackResponse.originalTransactionRef( entity.getOriginalTransactionRef() );
        chargebackResponse.outcome( entity.getOutcome() );
        chargebackResponse.reasonCode( entity.getReasonCode() );
        chargebackResponse.reasonDescription( entity.getReasonDescription() );
        chargebackResponse.representmentSubmitted( entity.getRepresentmentSubmitted() );
        chargebackResponse.status( entity.getStatus() );
        chargebackResponse.transactionAmount( entity.getTransactionAmount() );
        chargebackResponse.transactionDate( entity.getTransactionDate() );
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
