package com.cbs.merchant.mapper;

import com.cbs.merchant.dto.*;
import com.cbs.merchant.entity.AcquiringFacility;
import com.cbs.merchant.entity.MerchantChargeback;
import com.cbs.merchant.entity.MerchantSettlement;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AcquiringMapper {

    // ── Facility ─────────────────────────────────────────────────────────────────

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "reserveBalance", ignore = true)
    @Mapping(target = "pciComplianceStatus", ignore = true)
    @Mapping(target = "pciComplianceDate", ignore = true)
    @Mapping(target = "fraudScreeningEnabled", ignore = true)
    @Mapping(target = "threeDSecureEnabled", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    AcquiringFacility toEntity(SetupFacilityRequest request);

    FacilityResponse toFacilityResponse(AcquiringFacility entity);

    List<FacilityResponse> toFacilityResponseList(List<AcquiringFacility> entities);

    // ── Settlement ───────────────────────────────────────────────────────────────

    SettlementResponse toSettlementResponse(MerchantSettlement entity);

    List<SettlementResponse> toSettlementResponseList(List<MerchantSettlement> entities);

    // ── Chargeback ───────────────────────────────────────────────────────────────

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "merchantResponseRef", ignore = true)
    @Mapping(target = "merchantEvidence", ignore = true)
    @Mapping(target = "representmentSubmitted", ignore = true)
    @Mapping(target = "arbitrationRequired", ignore = true)
    @Mapping(target = "outcome", ignore = true)
    @Mapping(target = "financialImpact", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    MerchantChargeback toEntity(RecordChargebackRequest request);

    ChargebackResponse toChargebackResponse(MerchantChargeback entity);

    List<ChargebackResponse> toChargebackResponseList(List<MerchantChargeback> entities);
}
