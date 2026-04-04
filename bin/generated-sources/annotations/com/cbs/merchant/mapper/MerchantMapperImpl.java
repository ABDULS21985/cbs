package com.cbs.merchant.mapper;

import com.cbs.merchant.dto.MerchantResponse;
import com.cbs.merchant.dto.OnboardMerchantRequest;
import com.cbs.merchant.entity.MerchantProfile;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-04T23:56:11+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class MerchantMapperImpl implements MerchantMapper {

    @Override
    public MerchantProfile toEntity(OnboardMerchantRequest request) {
        if ( request == null ) {
            return null;
        }

        MerchantProfile.MerchantProfileBuilder merchantProfile = MerchantProfile.builder();

        merchantProfile.address( request.getAddress() );
        merchantProfile.businessType( request.getBusinessType() );
        merchantProfile.contactEmail( request.getContactEmail() );
        merchantProfile.contactName( request.getContactName() );
        merchantProfile.contactPhone( request.getContactPhone() );
        merchantProfile.mdrRate( request.getMdrRate() );
        merchantProfile.merchantCategoryCode( request.getMerchantCategoryCode() );
        merchantProfile.merchantName( request.getMerchantName() );
        merchantProfile.monthlyVolumeLimit( request.getMonthlyVolumeLimit() );
        merchantProfile.registrationNumber( request.getRegistrationNumber() );
        merchantProfile.riskCategory( request.getRiskCategory() );
        merchantProfile.settlementAccountId( request.getSettlementAccountId() );
        merchantProfile.settlementFrequency( request.getSettlementFrequency() );
        merchantProfile.taxId( request.getTaxId() );
        merchantProfile.tradingName( request.getTradingName() );

        return merchantProfile.build();
    }

    @Override
    public MerchantResponse toResponse(MerchantProfile entity) {
        if ( entity == null ) {
            return null;
        }

        MerchantResponse.MerchantResponseBuilder merchantResponse = MerchantResponse.builder();

        merchantResponse.address( entity.getAddress() );
        merchantResponse.businessType( entity.getBusinessType() );
        merchantResponse.chargebackRate( entity.getChargebackRate() );
        merchantResponse.contactEmail( entity.getContactEmail() );
        merchantResponse.contactName( entity.getContactName() );
        merchantResponse.contactPhone( entity.getContactPhone() );
        merchantResponse.createdAt( entity.getCreatedAt() );
        merchantResponse.id( entity.getId() );
        merchantResponse.mdrRate( entity.getMdrRate() );
        merchantResponse.merchantCategoryCode( entity.getMerchantCategoryCode() );
        merchantResponse.merchantId( entity.getMerchantId() );
        merchantResponse.merchantName( entity.getMerchantName() );
        merchantResponse.monitoringLevel( entity.getMonitoringLevel() );
        merchantResponse.monthlyVolumeLimit( entity.getMonthlyVolumeLimit() );
        merchantResponse.onboardedAt( entity.getOnboardedAt() );
        merchantResponse.registrationNumber( entity.getRegistrationNumber() );
        merchantResponse.riskCategory( entity.getRiskCategory() );
        merchantResponse.settlementAccountId( entity.getSettlementAccountId() );
        merchantResponse.settlementFrequency( entity.getSettlementFrequency() );
        merchantResponse.status( entity.getStatus() );
        merchantResponse.taxId( entity.getTaxId() );
        merchantResponse.terminalCount( entity.getTerminalCount() );
        merchantResponse.tradingName( entity.getTradingName() );
        merchantResponse.updatedAt( entity.getUpdatedAt() );

        return merchantResponse.build();
    }

    @Override
    public List<MerchantResponse> toResponseList(List<MerchantProfile> entities) {
        if ( entities == null ) {
            return null;
        }

        List<MerchantResponse> list = new ArrayList<MerchantResponse>( entities.size() );
        for ( MerchantProfile merchantProfile : entities ) {
            list.add( toResponse( merchantProfile ) );
        }

        return list;
    }
}
